<?php

namespace Lasso\Module\Number\Format;

/**
 * Exponential number format class
 *
 * @author Veronika Pavlisin <veronika.pavlisin@lookiassembly.de>
 * @version    1.00
 * @date       21.05.2022
 */
class Exponential
extends \Lasso\Module\Number\Format {

	/**
	 * {@inheritDoc}
	 */
	protected function format_rich_specific(
		string $number,
		string $original_number,
		int $exp,
		bool $is_negative,
		bool $has_context_menu
	) : string {
		// show the numbers in rich exponential format
		$negative_prefix = ( $is_negative ? "-" : "" );

		return $this->root->output_manager->render( [
			'@render' => 'snippets/number/rich_format',
			'plain_number' => $negative_prefix . $original_number,
			'rich_number_content' => $number
				. ( $exp != 0
					? '&nbsp;*&nbsp;10<sup><span style="font-size: 0">^</span>' . $exp . '</sup>'
					: ''
				),
			'has_context_menu' => $has_context_menu,
		] );
	}

	/**
	 * {@inheritDoc}
	 */
	protected function format_plain_specific(
		string $number,
		string $original_number,
		int $exp,
		bool $is_negative
	) : string {
		// show the number in plain exponential view
		return $exp > 0
			? $number . ' * 10^' . $exp
			: $number;
	}

	/**
	 * Unformats number formatted in exponential format
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
		$pattern = '/([-]?[0-9]+)[' . $this->regexp_separator . ']*([0-9]*)\s*\*\s*10\^([0-9]*)/';

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
