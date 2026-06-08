import { useEffect, useState } from 'react';

export function useElapsedTime(startedAtIso: string | null | undefined) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        if (!startedAtIso) {
            setElapsedSeconds(0);
            return;
        }

        const start = new Date(startedAtIso).getTime();

        const tick = () => {
            setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
        };

        tick();
        const id = window.setInterval(tick, 1000);

        return () => window.clearInterval(id);
    }, [startedAtIso]);

    return elapsedSeconds;
}
