import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DateRangeFilterProps = {
    dateFrom: string;
    dateTo: string;
    onChange: (from: string, to: string) => void;
    idPrefix?: string;
};

export function DateRangeFilter({
    dateFrom,
    dateTo,
    onChange,
    idPrefix = 'range',
}: DateRangeFilterProps) {
    const handleFromChange = (value: string) => {
        if (!value) return;
        onChange(value, dateTo < value ? value : dateTo);
    };

    const handleToChange = (value: string) => {
        if (!value) return;
        onChange(dateFrom > value ? value : dateFrom, value);
    };

    return (
        <div className="grid grid-cols-2 items-end gap-2 sm:flex">
            <div className="min-w-0 sm:w-36">
                <Label
                    htmlFor={`${idPrefix}_from`}
                    className="mb-1 block text-[10px] uppercase text-slate-500"
                >
                    Desde
                </Label>
                <Input
                    id={`${idPrefix}_from`}
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleFromChange(e.target.value)}
                    className="h-9 text-sm"
                />
            </div>
            <div className="min-w-0 sm:w-36">
                <Label
                    htmlFor={`${idPrefix}_to`}
                    className="mb-1 block text-[10px] uppercase text-slate-500"
                >
                    Hasta
                </Label>
                <Input
                    id={`${idPrefix}_to`}
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleToChange(e.target.value)}
                    className="h-9 text-sm"
                />
            </div>
        </div>
    );
}
