import { type PropsWithChildren } from 'react';

export default function LandingLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    );
}