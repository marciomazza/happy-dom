import * as PropertySymbol from '../PropertySymbol.js';
import type HTMLElement from '../nodes/html-element/HTMLElement.js';
import type HTMLFormElement from '../nodes/html-form-element/HTMLFormElement.js';
import type NodeList from '../nodes/node/NodeList.js';
import type HTMLLabelElement from '../nodes/html-label-element/HTMLLabelElement.js';
import HTMLLabelElementUtility from '../nodes/html-label-element/HTMLLabelElementUtility.js';
import type File from '../file/File.js';
import type FormData from '../form-data/FormData.js';

/**
 * Validity state exposed by ElementInternals.
 *
 * A simplified pass-through of whatever flags the element last reported via setValidity() -
 * form-associated custom elements own their own constraint-validation logic, unlike built-in
 * form controls which happy-dom's ValidityState computes from attributes/value.
 */
export interface IElementInternalsValidityState {
	valid: boolean;
	customError: boolean;
}

/**
 * ElementInternals gives a form-associated custom element (one whose class declares
 * `static formAssociated = true`) the hooks a built-in form control gets for free: a
 * submission value, form ownership, and constraint-validation reporting.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals
 */
export default class ElementInternals {
	#element: HTMLElement;
	#validityFlags: Record<string, boolean> = {};
	#validationMessage = '';

	/**
	 * Constructor.
	 *
	 * @param element The form-associated custom element this instance belongs to.
	 */
	constructor(element: HTMLElement) {
		this.#element = element;
	}

	/**
	 * Returns the form this element is associated with, resolved the same way built-in form
	 * controls are: the nearest ancestor `<form>`, or the document's `[form="id"]` match.
	 *
	 * @returns Form.
	 */
	public get form(): HTMLFormElement | null {
		if (this.#element[PropertySymbol.formNode]) {
			return this.#element[PropertySymbol.formNode];
		}
		const id = this.#element.getAttribute('form');
		if (!id || !this.#element[PropertySymbol.isConnected]) {
			return null;
		}
		return <HTMLFormElement | null>(
			this.#element[PropertySymbol.ownerDocument].getElementById(id)
		);
	}

	/**
	 * Returns the labels associated with this element, resolved the same way built-in form
	 * controls resolve theirs.
	 *
	 * @returns Labels.
	 */
	public get labels(): NodeList<HTMLLabelElement> {
		return HTMLLabelElementUtility.getAssociatedLabelElements(this.#element);
	}

	/**
	 * Returns whether this element participates in constraint validation.
	 *
	 * @returns "true" if the element will validate.
	 */
	public get willValidate(): boolean {
		return !(<{ disabled?: boolean }>(<unknown>this.#element)).disabled;
	}

	/**
	 * Returns the validity flags last set via setValidity().
	 *
	 * @returns Validity state.
	 */
	public get validity(): IElementInternalsValidityState {
		return {
			valid: !Object.values(this.#validityFlags).some(Boolean),
			customError: !!this.#validityFlags.customError
		};
	}

	/**
	 * Returns the validation message last set via setValidity(), or an empty string if valid.
	 *
	 * @returns Validation message.
	 */
	public get validationMessage(): string {
		return this.validity.valid ? '' : this.#validationMessage;
	}

	/**
	 * Sets the element's submission value and, optionally, its state for form-navigation
	 * restore. Only the submission value is used by happy-dom today (FormData construction) -
	 * `state` is accepted for API compatibility but not yet persisted/restored.
	 *
	 * @param value Submission value. `null` means "not submitted".
	 */
	public setFormValue(value: File | string | FormData | null): void {
		this.#element[PropertySymbol.internalsFormValue] = value;
	}

	/**
	 * Sets the element's constraint-validation flags and message.
	 *
	 * @param flags Validity flags (e.g. `{ customError: true }`). An empty object marks the
	 *   element valid.
	 * @param [message] Validation message, required when any flag is `true`.
	 */
	public setValidity(flags: Record<string, boolean>, message?: string): void {
		this.#validityFlags = { ...flags };
		this.#validationMessage = message || '';
	}

	/**
	 * Returns whether the element currently satisfies its constraints.
	 *
	 * @returns "true" if valid.
	 */
	public checkValidity(): boolean {
		return this.validity.valid;
	}

	/**
	 * Same as checkValidity() - happy-dom doesn't render a native validation bubble, so there's
	 * no extra UI step to perform here.
	 *
	 * @returns "true" if valid.
	 */
	public reportValidity(): boolean {
		return this.checkValidity();
	}
}
