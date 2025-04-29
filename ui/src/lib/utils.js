import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { cubicOut } from "svelte/easing";

/**
 * Merges CSS classes using the `twMerge` and `clsx` functions.
 *
 * @param {...(string|string[]|Record<string, boolean>)} inputs - The class names or objects to merge.
 * @returns {string} - A single string containing all merged class names.
 */
export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/**
 * Applies a flying and scaling animation to a given node.
 *
 * @param {HTMLElement} node - The target DOM element to animate.
 * @param {Object} [params] - Optional parameters for the animation.
 * @param {number} [params.y=-8] - Vertical translation in pixels.
 * @param {number} [params.x=0] - Horizontal translation in pixels.
 * @param {number} [params.start=0.95] - Initial scale factor (0 to 1).
 * @param {number} [params.duration=150] - Duration of the animation in milliseconds.
 *
 * @returns {Object} An object containing animation properties and a CSS function.
 */
export const flyAndScale = (
	node,
	params = { y: -8, x: 0, start: 0.95, duration: 150 }
) => {
	const style = getComputedStyle(node);
	const transform = style.transform === "none" ? "" : style.transform;

	/**
	 * Converts a value from one numerical scale to another.
	 *
	 * @param {number} valueA - The original value in the first scale.
	 * @param {[number, number]} scaleA - An array representing the minimum and maximum values of the first scale.
	 * @param {[number, number]} scaleB - An array representing the minimum and maximum values of the second scale.
	 * @returns {number} The converted value in the second scale.
	 *
	 * @throws {TypeError} If `scaleA` or `scaleB` is not an array with exactly two elements.
	 * @throws {RangeError} If the range of `scaleA` is zero, making percentage calculation impossible.
	 */
	const scaleConversion = (valueA, scaleA, scaleB) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	/**
	 * Converts an object representing CSS styles into a string format.
	 *
	 * @param {Object} style - An object where keys are CSS property names and values are the corresponding CSS values.
	 * @returns {string} A string containing the CSS properties and values in the format "property:value;".
	 *                   If a value is undefined, it will not be included in the resulting string.
	 *
	 * @throws {TypeError} Throws an error if the input is not an object.
	 */
	const styleToString = (style) => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, "");
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};