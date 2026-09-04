export default function WinnerPage() {
  // TODO: fetch from /winners/{currentCompetitionId}. Placeholder state below
  // covers the two real states this page needs to handle.
  interface WinnerPreview {
    displayName: string;
    announcedAt: number;
    prizeDescription: string;
  }
  // Placeholder — replace with a real useState/Firestore query for
  // /winners/{currentCompetitionId}. Wrapped in a function so TypeScript's
  // control-flow analysis doesn't narrow the literal `null` to `never`.
  function getWinnerPreview(): WinnerPreview | null {
    return null;
  }
  const winner = getWinnerPreview();

  return (
    <div className="container-page py-16">
      <p className="eyebrow">Winner Announcement</p>
      <h1 className="mt-4 text-4xl md:text-5xl">The Winner</h1>

      {!winner ? (
        <div className="panel mt-10 max-w-xl p-10 text-center">
          <p className="text-silver">
            The draw hasn't taken place yet. Once entries close, the winner
            will be announced here, with the date and method of selection
            confirmed as set out in the official rules.
          </p>
        </div>
      ) : (
        <div className="panel mt-10 max-w-xl p-10 text-center">
          <p className="eyebrow">Congratulations</p>
          <h2 className="mt-3 text-3xl">{winner.displayName}</h2>
          <p className="mt-2 text-sm text-silver">
            Announced {new Date(winner.announcedAt).toLocaleDateString("en-ZA")}
          </p>
          <p className="mt-6 text-silver">{winner.prizeDescription}</p>
        </div>
      )}

      <div className="mt-16">
        <h2 className="text-xl normal-case tracking-normal">Past Winners</h2>
        <p className="mt-4 text-sm text-silver">
          Previous competition winners will be listed here once available.
        </p>
      </div>
    </div>
  );
}
