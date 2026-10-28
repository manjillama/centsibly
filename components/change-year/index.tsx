import { useTransaction } from "@/context/transaction-provider";

export default function ChangeYear() {
  const { transactionData, changeToPreviousYear, changeToNextYear } =
    useTransaction();

  return (
    <div className="flex items-center gap-3">
      <button
        aria-label="Previous year"
        onClick={changeToPreviousYear}
        type="button"
        className="hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white w-8 h-8 rounded-lg transition-colors"
      >
        <svg
          className="mx-auto"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M9 4L9 11L4.5 7.5L9 4Z" fill="currentColor"></path>
        </svg>
      </button>
      <h2 className="text-base font-medium text-neutral-200 tabular-nums">
        {transactionData.currentYear}
      </h2>
      <button
        aria-label="Next year"
        onClick={changeToNextYear}
        type="button"
        className="hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white w-8 h-8 rounded-lg transition-colors"
      >
        <svg
          className="mx-auto"
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 11L6 4L10.5 7.5L6 11Z" fill="currentColor"></path>
        </svg>
      </button>
    </div>
  );
}
