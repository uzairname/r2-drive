'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@r2-drive/ui/lib/utils';
function Table({ className, ...props }) {
    return (_jsx("div", { "data-slot": "table-container", className: "relative w-full overflow-x-auto", children: _jsx("table", { "data-slot": "table", className: cn('w-full caption-bottom text-sm text-gray-900 dark:text-gray-100', className), ...props }) }));
}
function TableHeader({ className, ...props }) {
    return (_jsx("thead", { "data-slot": "table-header", className: cn('[&_tr]:border-b border-border', className), ...props }));
}
function TableBody({ className, ...props }) {
    return (_jsx("tbody", { "data-slot": "table-body", className: cn('[&_tr:last-child]:border-0', className), ...props }));
}
function TableFooter({ className, ...props }) {
    return (_jsx("tfoot", { "data-slot": "table-footer", className: cn('bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 font-medium [&>tr]:last:border-b-0', className), ...props }));
}
function TableRow({ className, ...props }) {
    return (_jsx("tr", { "data-slot": "table-row", className: cn('hover:bg-muted/30 border-b border-border transition-colors', className), ...props }));
}
function TableHead({ className, ...props }) {
    return (_jsx("th", { "data-slot": "table-head", className: cn('text-gray-900 dark:text-gray-100 h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className), ...props }));
}
function TableCell({ className, ...props }) {
    return (_jsx("td", { "data-slot": "table-cell", className: cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className), ...props }));
}
function TableCaption({ className, ...props }) {
    return (_jsx("caption", { "data-slot": "table-caption", className: cn('text-gray-500 dark:text-gray-400 mt-4 text-sm', className), ...props }));
}
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
