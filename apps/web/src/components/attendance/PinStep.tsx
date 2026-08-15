import PinPad from "./PinPad";

interface Props {
  employeeName: string | undefined;
  pin: string;
  pinError: string;
  isSubmitting: boolean;
  onBack: () => void;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export default function PinStep({ employeeName, pin, pinError, isSubmitting, onBack, onDigit, onClear, onBackspace }: Props) {
  return (
    <div className="w-full max-w-xs space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Enter Your PIN</h2>
          <p className="text-blue-300 text-sm">{employeeName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all duration-150 ${
                i < pin.length
                  ? "bg-blue-600 border-blue-600 text-white scale-105"
                  : "bg-gray-50 border-gray-200 text-gray-300"
              }`}
            >
              {i < pin.length ? "•" : ""}
            </div>
          ))}
        </div>

        {pinError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm text-center font-medium">
            {pinError}
          </div>
        )}

        <PinPad onDigit={onDigit} onClear={onClear} onBackspace={onBackspace} digitsDisabled={isSubmitting} />

        {isSubmitting && (
          <div className="text-center text-blue-600 text-sm font-medium animate-pulse">
            Verifying...
          </div>
        )}
      </div>
    </div>
  );
}
