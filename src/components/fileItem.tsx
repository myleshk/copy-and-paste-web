"use client";

import { useCallback } from "react";


export default function FileItem({ file, onRemove }: { file: File; onRemove: () => void }) {

    return (
        <div className="border rounded px-1 flex items-center">
            <button onClick={onRemove}>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="size-6"
                    >
                    <path color="red" strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>

            </button>
            <span className="text-sm">{file.name}</span>
        </div>
    );
}
