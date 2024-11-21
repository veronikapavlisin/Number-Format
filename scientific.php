<?php

namespace Lasso\Module\Number\Format;

/**
 * Scientific number format class
 *
 * @author Veronika Pavlisin <veronika.pavlisin@lookiassembly.de>
 * @version    1.00
 * @date       04.06.2022
 */
class Scientific
extends \Lasso\Module\Number\Format {

	/**
	 * {@inheritDoc}
	 *
	 * @throws \Lasso\Core\Exception\Not_Implemented
	 */
	protected function format_rich_specific(
		string $number,
		string $original_number,
		int $exp,
		bool $is_negative,
		bool $has_context_menu
	) : string {
		// throw exception if format is called on number format that is used for unformat only
		throw new \Lasso\Core\Exception\Not_Implemented(
			'Format ' . $this->class_type() . ' cannot be used for formatting'
		);
	}

	/**
	 * {@inheritDoc}
	 *
	 * @throws \Lasso\Core\Exception\Not_Implemented
	 */
	protected function format_plain_specific(
		string $number,
		string $original_number,
		int $exp,
		bool $is_negative
	) : string {
		// throw exception if format is called on number format that is used for unformat only
		throw new \Lasso\Core\Exception\Not_Implemented(
			'Format ' . $this->class_type() . ' cannot be used for formatting'
		);
	}

	/**
	 * Unformats number formatted in scientific format
	 *
	 * @param string $number
	 * @return string | false
	 */
	public function unformat_specific( string $number ) {

		$match_list = [];
		// matching groups
		// 1 - number before exponent (including minus)
		// 2 - number in decimal places
		// 3 - exponent
		$pattern = '/([-]?[0-9]+)[' . $this->regexp_separator . ']*([0-9]*)\s*E\s*\+([0-9]*)/';

		if ( \preg_match( $pattern, $number, $match_list ) ) {
			// number of zeros added is exponent minus number of decimal places
			$zeros_added = ( int )$match_list[ 3 ] - \strlen( $match_list[ 2 ] );

			if ( 0 <= $zeros_added ) {
				// producing full number with adding zeros to number without decimal point
				return $match_list[ 1 ] . $match_list[ 2 ] . \str_pad( '',  $zeros_added, '0' );
			}

			// shifting decimal separator
			$decimal_separator = \substr( $number, \strlen( $match_list[ 1 ] ), 1 );
			$decimal_separator_index = ( int )$match_list[ 3 ];
			$new_decimal_part = \substr( $match_list[ 2 ], $decimal_separator_index );

			// producing full number with moving number(s) from decimal part
			return $match_list[ 1 ]
				. \substr( $match_list[ 2 ], 0, $decimal_separator_index )
				. ( \strlen( $new_decimal_part ) > 0  ? $decimal_separator : '' )
				. $new_decimal_part;
		}

		return false;
	}
}
