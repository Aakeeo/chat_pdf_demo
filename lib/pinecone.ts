import { PineconeClient } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import md5 from "md5";
import { convertToAscii } from "./utils";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";

let pinecone: PineconeClient | null = null;

export const getPineconeClient = async () => {
  const pinecone = new PineconeClient();
  await pinecone.init({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });

  return pinecone;
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadS3IntoPineCone(filekey: string) {
  //Obtain the pdf file from s3
  console.log("Loading file from S3 into Pinecone");
  const file_name = await downloadFromS3(filekey);
  if (!file_name) throw new Error("File not found in S3");
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];
  console.log("Pages loaded from PDF");
  console.log(pages);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: [" ", ".", ",", ":", ";", "!", "?", "\n"],
  });

  const splitdocs = await splitter.splitDocuments(pages);

  const reducedDocs = splitdocs.map((doc) => {
    let { pageContent, metadata } = doc;
    return new Document({
      pageContent: pageContent,
      metadata: {
        text: trancateStringByByteLength(pageContent, 36000),
      },
    });
  });

  //split and segment the pages into smaller documents
  // const docs = await Promise.all(pages.map((page) => prepareDocument(page)));
  // console.log("Documents prepared");
  // console.log(docs);
  // const vectors = await Promise.all(docs.map((doc) => embedding(doc)));
  const embeddings = new OpenAIEmbeddings();
  // console.log(embeddings);

  const client = await getPineconeClient();
  const pineconeindex = client.Index("chatpdf");
  console.log("Uploading to pinecone");
  try {
    await PineconeStore.fromDocuments(reducedDocs, embeddings, {
      pineconeIndex: pineconeindex,
      namespace: convertToAscii(filekey),
      textKey: "text",
    });
    console.log("Uploaded to pinecone");
  } catch (err) {
    console.log("Error uploading to Pinecone", err);
  }

  // const namespace = pineconeindex.namespace(convertToAscii(filekey));

  // console.log("Inserting vectors into pinecone index");

  // await namespace.upsert(vectors);

  return reducedDocs[0];
}

// async function embedding(doc: Document) {
//   try {
//     const embeddings = await getEmbeddings(doc.pageContent);
//     const hash = md5(doc.pageContent);
//     return {
//       id: hash,
//       values: embeddings,
//       metadata: {
//         text: doc.metadata.text,
//         pageNumber: doc.metadata.pageNumber,
//       },
//     } as PineconeRecord;
//   } catch (err) {
//     console.log("Error getting embedding thing ", err);
//     throw err;
//   }
// }

export const trancateStringByByteLength = (str: string, length: number) => {
  const encoder = new TextEncoder();
  return new TextDecoder("utf-8").decode(encoder.encode(str).slice(0, length));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/(\r\n|\n|\r)/gm, "");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
    separators: [" ", ".", ",", ":", ";", "!", "?", "\n"],
  });
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: trancateStringByByteLength(pageContent, 36000),
      },
    }),
  ]);

  return docs;
}
