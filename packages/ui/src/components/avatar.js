'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@r2-drive/ui/lib/utils';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
function Avatar({ className, ...props }) {
    return (_jsx(AvatarPrimitive.Root, { "data-slot": "avatar", className: cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className), ...props }));
}
function AvatarImage({ className, ...props }) {
    return (_jsx(AvatarPrimitive.Image, { "data-slot": "avatar-image", className: cn('aspect-square size-full', className), ...props }));
}
function AvatarFallback({ className, ...props }) {
    return (_jsx(AvatarPrimitive.Fallback, { "data-slot": "avatar-fallback", className: cn('bg-muted flex size-full items-center justify-center rounded-full', className), ...props }));
}
export { Avatar, AvatarFallback, AvatarImage };
