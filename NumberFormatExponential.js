
/**
 * The exponential number format class
 *
 * @author     Veronika Pavlisin
 * @version    1.00
 * @date       21.05.2022
 */
class NumberFormatExponential extends NumberFormat {
	/**
	 * Constructor of exponential number format
	 *
	 * @param {string} type
	 * @param {NumberFormatManager} format_manager
	 */
	constructor( type, format_manager ) {
		super( type, format_manager );
	}

	/**
	 * @inheritDoc
	 */
	format_rich_specific(
		number,
		original_number,
		exp,
		is_negative,
		has_context_menu
	) {
		let negative_prefix = ( is_negative ? "-" : "" );
		let number_menu_class =
				'undefined' != typeof number_menu_enabled
				&& number_menu_enabled
				&& has_context_menu
					? 'number-menu'
					: '';
		// create element
		let element = document.createElement( 'span' );
		// add necessary classes
		element.classList.add(
			'tooltipExtention',
			'showTooltipDefault'
		);
		if ( 0 < number_menu_class.length ) {
			element.classList.add( number_menu_class );
		}
		// add tooltip title and set data attribute
		element.title = `${negative_prefix}${original_number}`;
		element.setAttribute( 'data', `${negative_prefix}${original_number}` );
		// set number to display
		element.innerHTML = number;
		// create additional elements for exponent
		if ( 0 !== exp ) {
			element.innerHTML = `${element.innerText}&nbsp;*&nbsp;10`;
			// prepare span within sup element
			let span = document.createElement( 'span' );
			span.style.fontSize = "0";
			span.innerText = "^";
			// prepare sup element
			let sup = document.createElement( 'sup' );
			// append span and text node with exponent
			sup.appendChild( span );
			sup.appendChild( document.createTextNode( exp.toString() ) );
			element.appendChild( sup );
		}
		// return html
		return element.outerHTML;
	}

	/**
	 * @inheritDoc
	 */
	format_plain_specific(
		number,
		original_number,
		exp,
		is_negative
	) {
		return exp > 0 ? number + ' * 10^' + exp : number;
	}

	/**
	 * @inheritDoc
	 */
	format_meta(
		number,
		original_number,
		exp,
		is_negative,
		fallback_to_default
	) {
		return Object.assign(
			{},
			super.format_meta( number, original_number, exp, is_negative ),
			{
				modifier: '*&nbsp;10',
				exponent: exp,
			}
		);
	}

	/**
	 * Unformats number from exponential format
	 *
	 * @param {string} number
	 */
	unformat_specific( number ) {
		// matching groups
		// 1 - number before exponent (including minus)
		// 2 - number in decimal places
		// 3 - exponent
		const regexp_separator = this.format_manager.get_regexp_separator();
		let match_list = number.match( new RegExp(
			'([-]?[0-9]+)[' + regexp_separator + ']*([0-9]*)\\s*\\*\\s*10\\^([0-9]*)'
		) );

		if ( match_list ) {
			// number of zeros added is exponent minus number of decimal places
			let zeros_added = parseInt( match_list[ 3 ] ) - match_list[ 2 ].length;

			if ( 0 <= zeros_added ) {
				// producing full number with adding zeros to number without decimal point
				return match_list[ 1 ]
					+ match_list[ 2 ]
					+ new String( '' ).padStart( zeros_added, '0' );
			}

			// shifting decimal separator
			let decimal_separator = number.substring( match_list[ 1 ].length, match_list[ 1 ].length + 1 ),
				decimal_separator_index = parseInt( match_list[ 3 ] ),
				new_decimal_part = match_list[ 2 ].substring( decimal_separator_index );

			// producing full number with moving number(s) from decimal part
			return match_list[ 1 ]
				+ match_list[ 2 ].substring( 0, decimal_separator_index )
				+ ( new_decimal_part.length > 0  ? decimal_separator : '' )
				+ new_decimal_part;

		}

		return this.is_rich_number( number );
	}

	/**
	 * @inheritDoc
	 */
	get_type_by_value( number, decimal ) {
		return 'exponential';
	}
}
