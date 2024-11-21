
/**
 * The scientific number format class
 *
 * @author     Veronika Pavlisin
 * @version    1.00
 * @date       04.06.2022
 */
class NumberFormatScientific extends NumberFormat {
	/**
	 * Constructor of exponential excel number format
	 *
	 * @param {string} type
	 * @param {NumberFormatManager} format_manager
	 */
	constructor( type, format_manager ) {
		super( type, format_manager );
	}

	/**
	 * @inheritDoc
	 *
	 * @throws Error
	 */
	format_rich_specific(
		number,
		original_number,
		exp,
		is_negative,
		has_context_menu
	) {
		throw new Error( 'Inactive scientific format is not usable for formatting' );
	}

	/**
	 * @inheritDoc
         *
	 * @throws Error
	 */
	format_plain_specific(
		number,
		original_number,
		exp,
		is_negative
	) {
		throw new Error( 'Inactive scientific format is not usable for formatting' );
	}

	/**
	 * @inheritDoc
	 *
	 * @throws Exception
	 */
	format_meta(
		number,
		original_number,
		exp,
		is_negative,
		fallback_to_default
	) {
		throw new Error( 'Inactive scientific format is not usable for formatting' );
	}

	/**
	 * Unformats number from scientific format
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
			'([-]?[0-9]+)[' + regexp_separator + ']*([0-9]*)\\s*E\\s*\\+([0-9]*)'
		) );

		if ( match_list ) {
			// number of zeros added is exponent minus number of decimal places
			let zeros_added = parseInt( match_list[ 3 ] ) - match_list[ 2 ].length;

			if ( 0 <= zeros_added ) {
				// producing full number with adding zeros to number without decimal point
				return match_list[1]
					+ match_list[2]
					+ new String('').padStart(zeros_added, '0');
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

		// check for rich format is not needed,
		// since scientific does not support it
		return false;
	}

	/**
	 * @inheritDoc
	 */
	get_type_by_value( number, decimal ) {
		throw new Error( 'Inactive scientific format is not usable for formatting' );
	}
}
