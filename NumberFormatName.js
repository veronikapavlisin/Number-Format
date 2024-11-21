
/**
 * The name number format class
 *
 * @author     Veronika Pavlisin
 * @version    1.00
 * @date       28.05.2022
 */
class NumberFormatName extends NumberFormat {
	/**
	 * Constructor of name number format
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
		if ( 'undefined' === typeof( this.exp_to_name[ exp ] ) && 0 !== exp ) {
			// calling finalize method of default format object in case of non-existing translation
			return this.format_manager.get_default_instance().format_rich_specific(
				number, original_number, exp, is_negative, has_context_menu
			);
		}

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
			element.innerHTML = `${element.innerText}&nbsp;${this.exp_to_name[ exp ]}`;
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
		if ( typeof( this.exp_to_name[ exp ] ) == 'undefined' ) {
			// calling finalize method of default format object in case of non-existing translation
			return this.format_manager.get_default_instance().format_plain_specific(
				number, original_number, exp, is_negative
			);
		}

		return 0 === exp
			? number
			: number + ' ' + this.exp_to_name[ exp ];
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
		if (
			'undefined' === typeof( this.exp_to_name[ exp ] )
			&& 0 !== exp
			&& fallback_to_default
		) {
			return this.format_manager.get_default_instance().format_meta(
				number, original_number, exp, is_negative
			);
		}
		return Object.assign(
			{},
			super.format_meta( number, original_number, exp, is_negative ),
			{
				modifier: '',
				exponent: 'undefined' == typeof this.exp_to_name[ exp ]
					? ( 0 === exp
						? 0
						: ''
					)
					: this.exp_to_name[ exp ],
			}
		);
	}

	/**
	 * Unformats number from name format
	 *
	 * @param {string} number
	 */
	unformat_specific( number ) {
		// matching groups
		// 1 - number before exponent (including minus)
		// 2 - number in decimal places
		// 3 - name of number
		const regexp_separator = this.format_manager.get_regexp_separator();
		let match_list = number.match( new RegExp(
			'([-]?[0-9]+)[' + regexp_separator + ']*([0-9]*)s*(.*)'
		) );

		if ( match_list ) {
			if ( typeof( this.name_to_exp[ match_list[ 3 ].trim() ] ) == 'undefined' ) {
				return false;
			}

			let decimal_scale = match_list[ 2 ].length;
			let exponent_scale = this.name_to_exp[ match_list[ 3 ].trim() ];

			// number of zeros added is scale of exponent identified by name
			// minus number of decimal places
			let zeros_added = exponent_scale - match_list[ 2 ].length;

			if ( exponent_scale <= decimal_scale ) {
				// producing full number with decimal point moved
				return match_list[ 1 ]
					+ match_list[ 2 ].substr( 0, exponent_scale )
					+ ( exponent_scale < decimal_scale
							? '.' + match_list[ 2 ].substr( exponent_scale )
							: ''
					);
			}
			// producing full number with adding zeros to number with decimal point vanished
			return match_list[ 1 ]
				+ match_list[ 2 ]
				+ new String( '' ).padStart( zeros_added, '0' );
		}

		return this.is_rich_number( number );
	}

	/**
	 * Sets additional properties with number names
	 *
	 * number_format_name_matrix expected in format
	 * {
	 *  'Tsd': 3,
	 *  'Mio': 6,
	 *  'Mrd': 9,
	 *  'Bio': 12,
	 *  'Brd': 15
	 * }
	 */
	set_data() {
		this.exp_to_name = [];
		this.name_to_exp = number_format_name_matrix;
		for (var i in number_format_name_matrix ) {
			this.exp_to_name[ number_format_name_matrix[ i ] ] = i;
		}
	}

	/**
	 * Translate name to exponent
	 * @param {String} name
	 * @return {Number}
	 */
	to_exponent( name ) {
		return 'undefined' == typeof this.name_to_exp[ name ] ? 0 : this.name_to_exp[ name ];
	}

	/**
	 * @inheritDoc
	 */
	get_type_by_value( number, decimal ) {
		const meta = this.format(
			number,
			true,
			decimal,
			true,
			true,
			false
		);
		// fallback to default
		if ( '' === meta.exponent ) {
			return this.format_manager.get_default_instance().get_type_by_value(
				number,
				decimal
			);
		}
		// return current type
		return this.type;
	}
}
