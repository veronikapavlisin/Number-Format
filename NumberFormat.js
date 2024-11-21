
/** @type {int} minimum number length for full format with name or exponent */
const NUMBER_MIN_LENGTH = 6;


/**
 * The abstraction of number format
 *
 * @author     Veronika Pavlisin
 * @version    1.20
 * @date       21.05.2022
 */
class NumberFormat {
	/**
	 * Constructor of number format
	 *
	 * @param {string} type
	 * @param {NumberFormatManager} format_manager
	 */
	constructor( type, format_manager ) {
		this.type = type;
		this.format_manager = format_manager;

		this.set_data();
	}

	/**
	 * Prepares number for formatting and calls specific format method
	 *
	 * @param {String} number
	 * @param {Boolean} [is_rich_format=true]
	 * @param {Number} [decimals=2]
	 * @param {Boolean} [meta_only=false]
	 * @param {Boolean} [has_context_menu=true]
	 * @param {Boolean} [fallback_to_default=true]
	 */
	format(
		number,
		is_rich_format = true,
		decimals = 2,
		meta_only = false,
		has_context_menu = true,
		fallback_to_default = true
	) {
		let is_negative;
		if ( bccomp( number, 0 ) < 0 ) {
			is_negative = true;
			number = number.replace( '-', '' ).trim();
		} else {
			is_negative = false;
		}

		let exp = 0;
		let original_number = number;
		let len = bcfloor( number ).length;

		if ( NUMBER_MIN_LENGTH < len ) {
			exp = parseInt( len / 3 );

			if ( 0 === len % 3 ) {
				exp--;
			}

			if ( exp > 0 ) {
				exp *= 3;
				let decimal_part = bcfloor( number ).substr( -1 * exp, decimals );
				number = bcfloor( bcdiv( number, '1'.padEnd( exp + 1, '0' ) ) );
				if ( decimal_part ) {
					number += '.' + decimal_part;
				}
			}
		}

		number = this.format_basic( number, decimals, exp > 0 );
		original_number = this.format_basic( original_number, 0 );

		if (is_negative) {
			number = '-' + number;
		}

		if ( meta_only ) {
			return this.format_meta(
				number,
				original_number,
				exp,
				is_negative,
				fallback_to_default
			);
		}

		if ( is_rich_format ) {
			// calling specific formatting method
			return this.format_rich_specific(
				number,
				original_number,
				exp,
				is_negative,
				has_context_menu
			);
		} else {
			// calling specific formatting method
			return this.format_plain_specific(
				number,
				original_number,
				exp,
				is_negative
			);
		}
	}

	/**
	 * Returns name of number format
	 */
	get_type() {
		return this.type;
	}

	/**
	 * Get type by number and decimal ( possibly overridden )
	 *
	 * @param number
	 * @param decimal
	 * @return {string}
	 */
	get_type_by_value( number, decimal ) {
		return this.type;
	}

	/**
	 * Method overriden for specific rich number format
	 *
	 * @param {String} number
	 * @param {String} original_number
	 * @param {Number} exp
	 * @param {Boolean} is_negative
	 * @param {Boolean} has_context_menu
	 */
	format_rich_specific( number, original_number, exp, is_negative, has_context_menu ) {}

	/**
	 * Method overriden for specific plain number format
	 *
	 * @param {String} number
	 * @param {String} original_number
	 * @param {Number} exp
	 * @param {Boolean} is_negative
	 */
	format_plain_specific( number, original_number, exp, is_negative ) {}

	/**
	 * Method overridden for format meta data
	 *
	 * @param {String} number
	 * @param {String} original_number
	 * @param {Number} exp
	 * @param {boolean} is_negative
	 * @param {boolean} fallback_to_default
	 * @return {Object}
	 */
	format_meta(
		number,
		original_number,
		exp,
		is_negative,
		fallback_to_default
	) {
		return {
			sign: is_negative ? '-' : '',
			number: number,
		}
	}

	/**
	 * Method overriden for specific data preparation, if needed
	 */
	set_data() {}

	/**
	 * Translate exponent
	 * @param {Number|String} name
	 * @return {Number}
	 */
	to_exponent( name ) {
		return name;
	}

	/**
	 * Checks whether number is a full number and returns it in unified full format
	 *
	 * @param {string} number
	 */
	is_full_number( number ) {
		const regexp_separator = this.format_manager.get_regexp_separator();

		let match_list = number.match( new RegExp( '[-|+]?([\\d' + regexp_separator + '\\s])*' ) );
		if ( match_list == null || match_list[ 0 ] !== number ) {
			return false;
		}

		// preserve information about number being negative
		let prefix = '-' === number.charAt( 0 ) ? '-' : '';

		let decimal_separator = this.format_manager.get_decimal_separator();

		// preserve information on decimal point
		let decimal_point_position = number.indexOf( decimal_separator );

		if ( -1 < decimal_point_position ) {
			// remove all non-digit characters separately for non-decimal and decimal part
			// and return with prefix (optional negative number)
			return prefix
				+ number.substr( 0, decimal_point_position).replace(/[^\d]/g, '' )
				+ decimal_separator
				+ number.substr( decimal_point_position + 1).replace(/[^\d]/g, '' );
		} else {
			// remove all non-digit characters and return with prefix (optional negative number)
			return prefix + number.replace( /[^\d]/g, '' );
		}
	}

	/**
	 * Checks whether number is a a rich number and returns plain number or false
	 *
	 * @param {string} number
	 */
	is_rich_number( number ) {
		// check for rich format
		const regexp_separator = this.format_manager.get_regexp_separator();
		let match_list = number.match(
			new RegExp( '<.* data="([\\d' + regexp_separator + ']*)".*>' )
		);

		if ( match_list ) {
			let plain_number = match_list[ 1 ].replace(
				new RegExp("\\" + this.format_manager.thousand_separator, "g"),
				""
			);

			// return extracted plain number if rich format of it matches the input string
			if ( number === this.format( plain_number, true ) ) {
				return plain_number;
			}
		}

		return false;
	}

	/**
	 * Reduces number by removing trailing zeros
	 * and return number of reduced zeros as exponent
	 *
	 * @param {string} number
	 */
	reduce_base( number ) {
		let exp = 0;
		if ( -1 === number.indexOf( this.format_manager.get_decimal_separator() ) ) {
			let match_list = number.match( /(0)*$/ );

			if ( typeof ( match_list[ 0 ] ) != 'undefined' ) {
				exp = match_list[ 0 ].length;
				number = number.substr( 0, ( number.length - 1 * exp ) );
			}
		}
		// return reduced number and exponent
		return [ number, exp, ];
	}

	/**
	 * Returns the scale of number
	 *
	 * @param {string} number
	 */
	get_scale( number ) {

		// ignore minus sign
		number = number.replace( '-', '' ).trim();

		let decimal_point_position = number.indexOf( this.format_manager.get_decimal_separator() );

		if ( -1 === decimal_point_position ) {
			return number.length;
		}

		return number.substr( 0, decimal_point_position ).length;
	}

	/**
	 * Wrapper that moves unformatting process to level of number format manager
	 *
	 * @param {string} number
	 * @param {NumberFormat} current (optional)
	 */
	unformat( number, current = null) {
		return this.format_manager.unformat( number, current );
	}

	/**
	 * Basic formatting by adding correct decimal and thousand separators
	 *
	 * @param {string} number
	 * @param {number} decimals
	 * @param {boolean} [force_decimals=false]
	 */
	format_basic( number, decimals, force_decimals ) {
		number = bcadd( number, '0', decimals );
		force_decimals = force_decimals || false;

		let is_negative;
		if ( -1 === bccomp( number , 0 ) ) {
			is_negative = true;
			number = number.replace( '-', '' ).trim();
		} else {
			is_negative = false;
		}

		// getting the position of the decimal separator,
		// which later serves us as length of the int-part of the number
		// and start of the decimal part of the number
		let decimal_position = number.indexOf( '.' );

		// if no decimal separator is found, we set the value to the last pos of the string
		if ( -1 === decimal_position ) {
			decimal_position = number.length;
		}

		// getting the int-part (the part before the .) and the decimal part
		let int_number = number.substring( 0, decimal_position );
		let dec_number = number.substring( decimal_position + 1 );

		// format number with separators
		let result = ( is_negative ? '-': '' )
			+ this.reverse_string(
				this.str_split(
					this.reverse_string( int_number ),
					3
				).join( this.format_manager.get_thousand_separator() )
			);

		// if there should be decimal part of the number,
		// use it to prepend the formatted int-part to it
		if ( force_decimals ) {
			dec_number = dec_number.padEnd( decimals, '0' );
		}
		if ( 0 < decimals && "" !== dec_number ) {
			result += this.format_manager.get_decimal_separator()
				+ ( dec_number.length > decimals
					? dec_number.substring( 0, decimals )
					: dec_number
				);
		}

		return result;
	}

	/**
	 * Reverses string
	 *
	 * @param {string} str
	 */
	reverse_string( str ) {
		return str.split("" ).reverse().join( "" );
	}

	/**
	 * Splits string into array by chunks
	 *
	 * @param {string} str
	 * @param {number} split_length
	 */
	str_split ( str, split_length ) {
		split_length = split_length || 1;

		if ( str === null || split_length < 1 ) {
			return false;
		}
		str += '';
		const chunks = [];
		let pos = 0;
		const len = str.length;
		while ( pos < len ) {
			chunks.push( str.slice( pos, pos += split_length ) );
		}
		return chunks;
	}
}
