/**
 * Reading the recogniser's output.
 *
 * The recogniser looks at a line image column by column and, for each step,
 * scores every character it knows plus a "nothing here" blank. The text is the
 * best character at each step with repeats collapsed and blanks removed.
 */

export interface RecognisedText {
  text: string;
  /** Mean certainty of the characters kept, 0 to 1. Zero when nothing was read. */
  confidence: number;
}

/**
 * Decode one line from a batch.
 *
 * @param scores  raw scores laid out as [step][line][character]
 * @param dims    [steps, lines, characters]
 * @param line    which line of the batch
 * @param steps   how many leading steps belong to this line (the rest is padding)
 * @param alphabet  characters by index; index 0 is the blank
 */
export function decodeLine(scores: ArrayLike<number>, dims: readonly number[], line: number, steps: number, alphabet: readonly string[]): RecognisedText {
  const [total = 0, lines = 0, size = 0] = dims;
  const count = Math.min(total, Math.max(1, steps));
  let previous = -1;
  let text = "";
  let certainty = 0;
  let kept = 0;
  for (let step = 0; step < count; step++) {
    const offset = (step * lines + line) * size;
    let best = 0;
    let top = -Infinity;
    for (let c = 0; c < size; c++) {
      const value = scores[offset + c]!;
      if (value > top) {
        top = value;
        best = c;
      }
    }
    if (best !== previous && best !== 0) {
      // Softmax of the winning character: 1 / sum(exp(score - top)).
      let spread = 0;
      for (let c = 0; c < size; c++) spread += Math.exp(scores[offset + c]! - top);
      text += alphabet[best] ?? "";
      certainty += 1 / spread;
      kept++;
    }
    previous = best;
  }
  return { text, confidence: kept ? certainty / kept : 0 };
}
