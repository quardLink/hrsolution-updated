interface Props {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  digitsDisabled: boolean;
}

export default function PinPad({ onDigit, onClear, onBackspace, digitsDisabled }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button
          key={d}
          onClick={() => onDigit(d)}
          disabled={digitsDisabled}
          className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xl hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all disabled:opacity-50"
        >
          {d}
        </button>
      ))}
      <button
        onClick={onClear}
        className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all"
      >
        CLR
      </button>
      <button
        onClick={() => onDigit("0")}
        disabled={digitsDisabled}
        className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 font-bold text-xl hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all disabled:opacity-50"
      >
        0
      </button>
      <button
        onClick={onBackspace}
        className="h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 font-semibold text-lg hover:bg-gray-100 active:scale-95 transition-all"
      >
        ⌫
      </button>
    </div>
  );
}
