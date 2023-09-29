import { PineconeClient } from "@pinecone-database/pinecone";
import { VectorDBQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";

import { StreamingTextResponse, LangChainStream } from "ai";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { convertToAscii } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { messages, chatId } = await req.json();
  const { stream, handlers, writer } = LangChainStream();
  const _chats = await db.select().from(chats).where(eq(chats.id, chatId));
  if (_chats.length !== 1) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  const filekey = _chats[0].filekey;

  const pinecone = new PineconeClient();
  await pinecone.init({
    environment: process.env.PINECONE_ENVIRONMENT!,
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const lastMessage = messages[messages.length - 1];

  const pineconeIndex = await pinecone.Index("chatpdf");

  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex, namespace: convertToAscii(filekey) }
  );

  const model = new ChatOpenAI({ streaming: true });

  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
    k: 1,
    returnSourceDocuments: true,
  });

  const response = await chain.call({ query: lastMessage.content });
  return NextResponse.json(response.text, { status: 200 });
}
