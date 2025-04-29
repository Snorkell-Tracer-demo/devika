import { Tiktoken } from "tiktoken/lite";
import cl100k_base from "tiktoken/encoders/cl100k_base.json";

const encoding = new Tiktoken(
  cl100k_base.bpe_ranks,
  cl100k_base.special_tokens,
  cl100k_base.pat_str
);

/**
 * Calculates the number of tokens in the given text.
 *
 * This function uses an encoding method to convert the input text into tokens
 * and returns the count of these tokens.
 *
 * @param {string} text - The input text for which the token count is calculated.
 * @returns {number} The number of tokens in the input text.
 *
 * @throws Will throw an error if the input text is not a valid string.
 */
export function calculateTokens(text) {
  const tokens = encoding.encode(text);
  return tokens.length;
}
