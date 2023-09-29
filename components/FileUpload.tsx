"use client";
import { useMutation } from "@tanstack/react-query";
import { Inbox, Loader2 } from "lucide-react";
import React from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { uploadtoS3 } from "@/lib/s3";

type Props = {};

const FileUpload = (props: Props) => {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const { mutate, isLoading } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string;
      file_name: string;
    }) => {
      const response = await axios.post("/api/create-chat", {
        file_key,
        file_name,
      });
      return response.data;
    },
  });

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFile) => {
      console.log(acceptedFile);

      const file = acceptedFile[0];

      if (file.size > 10 * 1024 * 1024) {
        alert("Please upload a file less than 10 MB");
        return;
      }
      try {
        setUploading(true);
        const data = await uploadtoS3(file);
        if (!data?.file_key || !data?.file_name) {
          console.log(data);
          return;
        }
        await mutate(data, {
          onSuccess: ({ chat_id }) => {
            toast.success("Chat Created!");
            router.push(`/chat/${chat_id}`);
            console.log("Chat Created!");
          },
        });
      } catch (err) {
        console.log(err);
      } finally {
        setUploading(false);
      }
    },
  });
  return (
    <div className="p-2  rounded-x1">
      <div
        {...getRootProps({
          className:
            "border-dashed border-2 rounded-xl cursor-pointer bg-gray-100 py-8 flex justify-center items-center  flex-col",
        })}
      >
        <input {...getInputProps()} />
        {uploading || isLoading ? (
          <>
            {/* loading state */}
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
            <p className="mt-2 text-sm text-slate-400">
              Spilling Tea to GPT...
            </p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">Drop PDF Here</p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
