<?php

namespace Lasso\Module\Number;

/**
 * Abstract base class for number format
 *
 * @author Veronika Pavlisin <veronika.pavlisin@lookiassembly.de>
 * @version    1.20
 * @date       21.05.2022
 *
 * @property string $decimal_separator
 * @property string $thousand_separstor
 */
abstract class Format
extends \Lasso\Core\Component {

	/** @const int minimum number length for full format with name or exponent */
	const NUMBER_MIN_LENGTH = 6;

	/** @var string */
	private string $decimal_separator;

	/** @var string */
	private string $thousand_separator;

	/**
	 * {@inheritDoc}
	 */
	protected function init() {
		// parent init
		parent::init();

		// cache separators
		$dic = $this->root->factory_dictionary->default;
		$this->decimal_separator = $dic->query(
			'numbers' . $dic::TRANSLATION_SEPARATOR . 'decimalSep'
		);
		$this->thousand_separator = $dic->query(
			'numbers' . $dic::TRANSLATION_SEPARATOR . 'thousandSep'
		);
	}

	/**
	 * Finalizes format of prepared number (specific for each format)
	 *
	 * @param string $number
	 * @param string $original_number
	 * @param int $exp
	 * @param bool $is_negative
	 * @param bool $has_context_menu
	 * @return string
	 */
	protected abstract function format_rich_specific(
		string $number,
		string $original_number,
		int $exp,
		bool $is_negative,
		bool $has_context_menu
	) : string ;

	/**
	 * Finalizes format of prepared number (specific for each format)
	 *
	 * @param string $number
	 * @param string $original_number
	 * @param int $exp
	 * @param bool $is_negative
	 * @return string
	 */
	protected abstract function format_plain_specific(
		string $number,
		string $original_number,
		int $exp,
		bool $is_negative
	) : string ;

	/**
	 * Unformats formatted number (specific for each format)
	 *
	 * @param string $number
	 * @return string | false
	 */
	public abstract function unformat_specific( string $number );

	/**
	 * Helper for rich HTML format
	 *
	 * @param string $number
	 * @param int $decimals ( optional )
	 * @param bool $has_context_menu ( optional )
	 * @return string
	 *
	 * @throws \Lasso\Core\Exception\Not_Implemented
	 */
	public function format_rich(
		string $number,
		int $decimals = 2,
		bool $has_context_menu = true,
		string $decimal_separator_override = null,
		string $thousand_separator_override = null
	): string {
		return $this->format(
			$number,
			true,
			$decimals,
			0,
			$has_context_menu,
			$decimal_separator_override,
			$thousand_separator_override
		);
	}

	/**
	 * Helper for plain format
	 *
	 * @param string $number
	 * @param int $decimals ( optional )
	 * @return string
	 *
	 * @throws \Lasso\Core\Exception\Not_Implemented
	 */
	public function format_plain(
		string $number,
		int $decimals = 2,
		bool $has_context_menu = false,
		string $decimal_separator_override = null,
		string $thousand_separator_override = null
	) : string {
		return $this->format(
			$number,
			false,
			$decimals,
			0,
			$has_context_menu,
			$decimal_separator_override,
			$thousand_separator_override
		);
	}

	/**
	 * Prepares number (common for each format) and calls specific formatting method
	 *
	 * @param string $number
	 * @param bool $rich_format ( optional )
	 * @param int $decimals ( optional )
	 * @param int $exp ( optional )
	 * @param bool $has_context_menu ( optional )
	 * @return string
	 *
	 * @throws \Lasso\Core\Exception\Not_Implemented
	 */
	protected function format(
		string $number,
		bool $rich_format = true,
		int $decimals = 2,
		int $exp = 0,
		bool $has_context_menu = true,
		string $decimal_separator_override = null,
		string $thousand_separator_override = null
	) : string {

		// preparing number
		$math = $this->root->math;

		if ( $math->lt( $number, 0 ) ) {
			$is_negative = true;
			$number = $math->absolute( $number, $decimals );
		} else {
			$is_negative = false;
		}

		$original_number = $number;
		$len = \strlen( $math->floor( $number ) );

		if ( static::NUMBER_MIN_LENGTH < $len ) {
			$exp += \intdiv( $len, 3 );
			if ( $len % 3 == 0 ) {
				$exp--;
			}
			if ( $exp > 0 ) {
				$exp = $exp * 3;
				$decimal_part = \substr( $math->floor( $number ), -1 * $exp, $decimals );
				$number = $math->floor(
					$math->div(
						$number,
						\str_pad( '1', $exp + 1, '0' )
					)
				);
				if ( $decimal_part ) {
					$number .= '.' . $decimal_part;
				}
			}
		}

		$number = $this->format_basic(
			$number,
			$decimals,
			$exp > 0 && $decimals < 10,
			$decimal_separator_override,
			$thousand_separator_override
		);
		$original_number = $this->format_basic(
			$original_number,
			$decimals,
			false,
			$decimal_separator_override,
			$thousand_separator_override
		);

		if ( $is_negative ) {
			$number = '-' . $number;
		}

		// calling specific formatting method based on rich format flag
		return \call_user_func(
			[ $this, 'format_' . ( $rich_format  ? 'rich' : 'plain' ) . '_specific', ],
			$number,
			$original_number,
			$exp,
			$is_negative,
			$has_context_menu
		);
	}

	/**
	 * Wrapper that moves unformatting process to level of number format manager
	 *
	 * @param string $number
	 * @return string | false
	 */
	public function unformat( string $number ) {
		return $this->root->number_format_manager->unformat( $number, $this );
	}

	/**
	 * Checks if number is already a full number
	 * or close to it's format (+, -, thousand and decimal separators are allowed)
	 * and return it in full number format
	 *
	 * @param string $number
	 * @return string | false if number is not full number (or close to it)
	 */
	public function is_full_number( string $number ) {

		$pattern = '/[-|+]?([\d' . $this->regexp_separator . '\s])*/';

		// check number in chunks in case it is too long (more than 5k characters)
		if ( \strlen( $number ) > 5000 ) {
			foreach ( \explode( "\r\n", \chunk_split( $number, 5000, "\r\n" ) ) as $chunk ) {
				\preg_match( $pattern, $chunk, $match_list );
				if( $match_list[ 0 ] != $chunk ) {
					return false;
				}
			}
		} else {
			\preg_match( $pattern, $number, $match_list );
			if( $match_list[ 0 ] != $number ) {
				return false;
			}
		}

		// preserve information about number being negative
		$prefix = \substr( trim( $number ), 0, 1 ) == '-' ? '-' : '';

		// preserve information on decimal point
		$decimal_point_position = \strpos(
			$number,
			$this->decimal_separator
		);

		if ( -1 < $decimal_point_position ) {
			// remove all non-digit characters separately for non-decimal and decimal part
			// and return with prefix (optional negative number)
			return $prefix .
				\preg_replace(
					'/[^\d]/',
					'',
					\substr( $number, 0, $decimal_point_position )
				)
				. '.'
				. \preg_replace(
					'/[^\d]/',
					'',
					\substr( $number, $decimal_point_position + 1 )
				);
		} else {
			// remove all non-digit characters and return with prefix (optional negative number)
			return $prefix . \preg_replace( '/[^\d]/', '', $number );
		}
	}

	/**
	 * Reduces full number (without decimal part - so without information loss)
	 * and returns base and exponent
	 *
	 * @param string $number
	 * @return array
	 */
	public function reduce_base( string $number ) : array {

		$exp = 0;

		if ( false === \strpos( $number, '.' ) ) {
			\preg_match( '/(0)*$/', $number, $match_list );

			if ( ! empty( $match_list[ 0 ] ) ) {
				$exp = \strlen( $match_list[ 0 ] );
				$number = \substr( $number, 0, \strlen( $number ) -1 * $exp );
			}
		}

		// return reduced number and exponent
		return [ $number, $exp, ];
	}

	/**
	 * Returns scale of full number (without decimal part)
	 *
	 * @param string $number
	 * @return int
	 */
	public function get_scale( string $number ) : int {
		return \strlen( $this->root->math->floor( $number ) );
	}

	/**
	 * Returns regexp separators value
	 *
	 * @return string
	 */
	protected function get_regexp_separator() : string {
		return \str_replace(
			'.',
			'\\.',
			$this->decimal_separator . $this->thousand_separator
		);
	}

	/**
	 * Basic formatting by adding correct decimal and thousand separators
	 *
	 * @param string $number
	 * @param int $precision
	 * @param bool $force_precision
	 * @return string
	 */
	public function format_basic(
		string $number,
		int $precision,
		bool $force_precision = false,
		string $decimal_separator_override = null,
		string $thousand_separator_override = null
	): string {

		$math = $this->root->math;

		$number = $math->makeNumber( $number, $precision );

		if( $math->comp( $number , 0) == -1 ) {
			$is_negative = true;
		} else {
			$is_negative = false;
		}

		$number = $math->absolute( $number, $precision );

		// getting the position of the decimal separator,
		// which later serves us as length of the int-part of the number
		// and start of the decimal part of the number
		$decimal_position = \strpos( $number, '.' );

		// if no decimal separator is found, we set the value to the last pos of the string
		if ( false === $decimal_position ) {
			$decimal_position = \strlen( $number );
		}

		// getting the int-part (the part before the .) and the decimal part
		$int_number = \substr( $number, 0, $decimal_position );
		$dec_number = \substr( $number, ( $decimal_position + 1 ) );

		// format number with separators
		$result = ( $is_negative ? '-': '' )
			. \strrev(
				\implode(
					$thousand_separator_override ?? $this->thousand_separator,
					\str_split( \strrev( $int_number ), 3 )
				)
			);

		// if there is a decimal part of the number, use it to prepend
		// the formatted int-part to it, but only if it is non-zero or precision is forced
		if (
			'' != $dec_number
			&& (
				'' != rtrim( $dec_number, '0' )
				|| $force_precision
			)
		) {
			$result .= ( $decimal_separator_override ?? $this->decimal_separator )
				. ( $force_precision ? $dec_number : rtrim( $dec_number, '0' ) );
		}

		return $result;
	}
}
