import * as React from "react";
import Link from "next/link";
import { File, Folder } from "lucide-react";

import { cn } from "@/lib/utils";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";

interface FileItemType {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: Date;
  path: string;
}

interface FileListProps {
  files: FileItemType[];
  className?: string;
}

export function FileList({ files, className }: FileListProps) {
  return (
    <Table className={cn("", className)}>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Last Modified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id}>
            <TableCell>
              <Link
                href={file.path}
                className="flex items-center space-x-2 hover:underline"
              >
                {file.type === "folder" ? (
                  <Folder className="h-4 w-4 text-blue-500" />
                ) : (
                  <File className="h-4 w-4 text-gray-500" />
                )}
                <span>{file.name}</span>
              </Link>
            </TableCell>
            <TableCell>
              {file.type === "file" && file.size
                ? formatBytes(file.size)
                : "-"}
            </TableCell>
            <TableCell>
              {file.lastModified
                ? formatDate(file.lastModified)
                : "-"}
            </TableCell>
          </TableRow>
        ))}
        {files.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center py-8">
              No files found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}