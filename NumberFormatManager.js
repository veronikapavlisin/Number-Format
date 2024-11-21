
const FORMAT_CLASS_LIST = {
	NumberFormatName,
	NumberFormatExponential,
	NumberFormatScientific
};

/**
 * The class for number format manager
 *
 * @author     Veronika Pavlisin
 * @version    1.20
 * @date       21.05.2022
 */
class NumberFormatManager {

	/**
	 * Constructor of number format manager
	 *
	 * @param {array} format_list expected in format [ 'name', 'exponential', ... , ]
	 * @param {string} current_format_name
	 * @param {string} default_format_name
	 * @param {string} decimal_separator
	 * @param {string} thousand_separator
	 */
	constructor(
		format_list,
		current_format_name,
		default_format_name,
		decimal_separator,
		thousand_separator
	) {
		this.instance_list = {};
		this.default_instance = null;
		this.current_instance = null;
		this.decimal_separator = decimal_separator;
		this.thousand_separator = thousand_separator;
		this.regexp_separator = new String(
			decimal_separator + thousand_separator
		).replace( '.', '\\.');

		for ( var i in format_list) {
			this.instance_list[ format_list[ i ] ]
				= NumberFormatManager.create_instance( format_list[ i ], this );
			if ( default_format_name == format_list[ i ] ) {
				this.default_instance = this.instance_list[ format_list[ i ] ];
			}
			if ( current_format_name == format_list[ i ] ) {
				this.current_instance = this.instance_list[ format_list[ i ] ];
			}
		}

		return this;
	}

	/**
	 * Creates instance of number format object
	 *
	 * @param {string} format_name
	 * @param {NumberFormatManager} format_manager
	 */
	static create_instance( format_name, format_manager) {
		var format_class_name = 'NumberFormat'
			+ format_name.trim().charAt( 0 ).toUpperCase()
			+ format_name.trim().slice( 1 );

		const formatCreator = FORMAT_CLASS_LIST[ format_class_name ];
		const format = formatCreator
			? new formatCreator( format_name, format_manager )
			: null;

		return format;
	}

	/**
	 * Returns default number format object
	 */
	get_default_instance() {
		return this.default_instance;
	}

	/**
	 * Returns current number format object
	 */
	get_current_instance() {
		// if current object was not created, use default format object as current
		if ( null == this.current_instance ) {
			this.current_instance = this.default_instance;
		}
		return this.current_instance;
	}

	/**
	 * Returns decimal separator
	 */
	get_decimal_separator() {
		return this.decimal_separator;
	}

	/**
	 * Returns thousand separator
	 */
	get_thousand_separator() {
		return this.thousand_separator;
	}

	/**
	 * Returns regexp separators
	 */
	get_regexp_separator() {
		return this.regexp_separator;
	}

	/**
	 * Unformats number
	 *
	 * @param {string} number
	 * @param {NumberFormat} current
	 *
	 * @throws Exception
	 */
	unformat( number, current = null ) {

		// get current format object in case it wasn't supplied
		if ( null == current ) {
			current = this.get_current_instance();
		}
		var full_number = current.is_full_number( number );
		// check if number is not full number already and does not need any unformatting
		if ( false !== full_number ) {
			return full_number;
		}

		// current (user's) format is tried as first
		var current_result = current.unformat_specific( number );
		if ( false !== current_result ) {
			return current_result;
		}
		var current_format = current.get_type();

		// try unformatting via every other available format except current
		for( var index in this.instance_list ) {
			if ( index != current_format ) {
				let result = this.instance_list[ index ].unformat_specific( number );

				if ( false !== result ) {
					return result;
				}
			}
		}

		// throw exception if none of available formats was able to unformat the number
		throw 'Unable to unformat input ' + number;
	}

	/**
	 * Compares two numbers
	 *
	 * @param {string} number1
	 * @param {string} number2
	 *
	 * @throws Exception
	 */
	compare( number1, number2 ) {
		var full_number1 = this.unformat( number1 );
		if ( false == full_number1 ) {
			throw 'unable to transform ' + number1 + ' into full number';
		}

		var full_number2 = this.unformat( number2 );
		if ( false == full_number2 ) {
			throw 'unable to transform ' + number2 + ' into full number';
		}

		// return 0 in case of equality
		if ( full_number1 === full_number2 ) {
			return 0;
		}

		var current = this.get_current_instance();

		// get information about numbers being negative
		var negative1 = number1.trim().substr( 0, 1 ) == '-' ? true : false;
		var negative2 = number2.trim().substr( 0, 1 ) == '-' ? true : false;

		var exp = 0;
		// reducing only has meaning if both numbers have same polarity
		if ( negative1 && negative2 || !negative1 && !negative2 ) {
			var reduced = current.reduce_base( full_number1 );
			var reduced_number1 = reduced[ 0 ];
			var exp1 = reduced[ 1 ];
			reduced = current.reduce_base( full_number2 );
			var reduced_number2 = reduced[ 0 ];
			var exp2 = reduced[ 1 ];

			// determine smallest common exponent
			if ( exp1 > exp2 ) {
				// if first exponent is bigger
				exp = exp2;
				// first number will gain zeros that could not have been removed from second number
				full_number1 = reduced_number1 + new String( '' ).padStart( exp1 - exp2, '0' );
				full_number2 = reduced_number2;
			} else {
				// if second exponent is bigger or same
				exp = exp1;
				full_number1 = reduced_number1;
				// second number will gain zeros that could not have been removed from first number
				full_number2 = reduced_number2 + new String( '' ).padStart( exp2 - exp1, '0' );
			}
		}

		// determine scale of difference
		var difference = bcsub( full_number1, full_number2 )
		var difference_scale = current.get_scale( difference ) + exp;

		var smaller_number, level_polarity;
		// determine which of numbers is smaller
		if ( negative1 && !negative2 ) {
			// second number is positive and first number is negative, thus first is smaller
			smaller_number = full_number1;
			level_polarity = 1;
		} else if ( !negative1 && negative2 ) {
			// first number is positive and second number is negative, thus second is smaller
			smaller_number = full_number2;
			level_polarity = -1;
		} else if ( !negative1 && !negative2 ) {
			// both numbers are positive
			level_polarity = bccomp( full_number1, full_number2 );
			smaller_number = level_polarity == 1
				? full_number2
				: full_number1;
		} else {
			// both numbers are negative, for purposes of scale greater is taken as smaller
			level_polarity = bccomp( full_number1, full_number2 );
			smaller_number = level_polarity == 1
				? full_number1
				: full_number2;
		}

		var smaller_scale = current.get_scale( smaller_number ) + exp;

		var level;
		// resulting level is determined based on comparing
		// difference scale to smaller number scale
		if ( difference_scale < 3 ) {
			// level 1 - difference scale is max 2
			level = 1;
		} else if ( difference_scale < smaller_scale ) {
			// level 2 - difference scale is higher than 2 and smaller than smaller number scale
			level = 2;
		} else {
			// level 3 - difference scale is equal or higher than smaller number scale
			level = 3;
		}

		return level_polarity * level;
	}
}
