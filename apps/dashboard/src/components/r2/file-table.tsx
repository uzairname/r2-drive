import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Folder, File, Image, Music, Video, Archive, FileText, FileJson, FileCode, FileType2, FileSpreadsheet, Calendar, ArrowUp, ArrowDown, ArrowUpDown, Trash2 } from "lucide-react";
import { getMimeType } from "../../lib/file-utils";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import { truncateString } from "@workspace/ui/lib/utils";

function itemToIcon(item: UIFileItem) {
  return item.type === "folder" ? (
    <Folder className="h-5 w-5 text-primary" />
  ) : (() =>{
    const mimeType = getMimeType(item.name)
    if (mimeType.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType.startsWith("audio/")) return <Music className="h-5 w-5 text-pink-500" />;
    if (mimeType.startsWith("video/")) return <Video className="h-5 w-5 text-purple-500" />;
    if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />; // No FilePdf, use FileText
    if (mimeType === "application/zip" || mimeType === "application/x-rar-compressed" || mimeType === "application/x-7z-compressed" || mimeType === "application/x-tar" || mimeType === "application/gzip") return <Archive className="h-5 w-5 text-orange-500" />;
    if (mimeType === "application/json") return <FileJson className="h-5 w-5 text-green-500" />;
    if (mimeType === "text/plain" || mimeType === "text/markdown") return <FileText className="h-5 w-5 text-muted-foreground" />;
    if (mimeType === "text/html" || mimeType === "text/css" || mimeType === "text/javascript" || mimeType === "text/typescript" || mimeType === "application/xml") return <FileCode className="h-5 w-5 text-yellow-500" />;
    if (mimeType === "application/vnd.ms-excel" || mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mimeType === "text/csv" || mimeType === "text/tab-separated-values") return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    if (mimeType === "application/msword" || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return <FileText className="h-5 w-5 text-blue-700" />; // No FileWord, use FileText
    if (mimeType === "application/vnd.ms-powerpoint" || mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return <FileType2 className="h-5 w-5 text-orange-600" />; // No FilePpt, use FileType2
    return <FileType2 className="h-5 w-5 text-muted-foreground" />;
  })()
}

export interface UIFileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: string;
  lastModified: string;
}

export interface TableSortProps {
  sortKey: "name" | "size" | "lastModified";
  sortDirection: "asc" | "desc";
  onSort: (key: "name" | "size" | "lastModified") => void;
}

export interface R2FileTableProps {
  items: UIFileItem[];
  selectedItems: string[];
  onItemSelect: (itemId: string) => void;
  onSelectAll: () => void;
  onFolderClick: (folderName: string) => void;
  onDeleteItem?: (itemId: string, itemName: string) => void;
  tableSort?: TableSortProps;
}

export function R2FileTable({ items, selectedItems, onItemSelect, onSelectAll, onFolderClick, onDeleteItem, tableSort }: R2FileTableProps) {
  const renderSortIcon = (key: "name" | "size" | "lastModified") => {
    if (!tableSort) return null;
    if (tableSort.sortKey !== key) return <ArrowUpDown className="inline h-4 w-4 text-muted-foreground ml-1" />;
    if (tableSort.sortDirection === "asc") return <ArrowUp className="inline h-4 w-4 text-muted-foreground ml-1" />;
    return <ArrowDown className="inline h-4 w-4 text-muted-foreground ml-1" />;
  };
  return (
    <div className="border border-border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                onCheckedChange={onSelectAll}
                aria-label="Select all items"
              />
            </TableHead>
            <TableHead className="text-left cursor-pointer select-none" onClick={() => tableSort?.onSort("name")}>Name{renderSortIcon("name")}</TableHead>
            <TableHead className="text-left w-32 cursor-pointer select-none" onClick={() => tableSort?.onSort("size")}>Size{renderSortIcon("size")}</TableHead>
            <TableHead className="text-left w-48 cursor-pointer select-none" onClick={() => tableSort?.onSort("lastModified")}>Last Modified{renderSortIcon("lastModified")}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>  
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="border-b border-border hover:bg-muted/50 cursor-pointer group"
              onClick={() => item.type === "folder" && onFolderClick(item.name)}
            >
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => onItemSelect(item.id)}
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                  aria-label={`Select ${item.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {itemToIcon(item)}
                  <span 
                    className="font-medium text-foreground" 
                    title={item.name}
                  >
                    {truncateString(item.name, 40)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{item.size || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {item.lastModified}
                </div>
              </TableCell>
              <TableCell>
                {onDeleteItem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id, item.name);
                    }}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
