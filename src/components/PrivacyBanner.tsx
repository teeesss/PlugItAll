import React from 'react';
import { cn } from '../utils/cn';

interface PrivacyBannerProps {
    className?: string;
    maxWidth?: string;
}

export const PrivacyBanner: React.FC<PrivacyBannerProps> = ({
    className,
    maxWidth = "max-w-md" // Default to the narrower "Hero" width as requested
}) => {
    return (
        <div className={cn(
            "bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300 mx-auto text-center backdrop-blur-sm",
            maxWidth,
            className
        )}>
            <span className="font-semibold">🔒 Privacy First:</span> Your files are processed entirely in your browser.
            <br className="hidden sm:block" />
            No transaction data is <strong className="text-blue-200">ever</strong> uploaded to any server.
        </div>
    );
};
