<?php

namespace Lasso\Module\Number\Format;

/**
 * Names number format class
 *
 * @author Veronika Pavlisin <veronika.pavlisin@lookiassembly.de>
 *
 * @version    1.00
 * @date       28.05.2022
 *
 * @property array $number_name_matrix
 * @property array $numbers_translation_list
 */
class Name
extends \Lasso\Module\Number\Format {

	/** @var array */
	private array $number_name_matrix = [];

	/** @var array */
	private array $numbers_translation_list = [];

	/**
	 * {@inheritDoc}
	 */
	protected function init() {
		// parent init
		parent::init();

		// cache numbers translations
		$this->numbers_translation_list
			= $this->root->factory_dictionary->default->query( 'numbers' );

		// caching list of exponents identified by name
		foreach ( $this->numbers_translation_list as $exp => $name ) {
			if ( \substr( $exp, 0, 3 ) == 'exp' ) {
				$this->number_name_matrix[ $name ] = ( int )\substr( $exp, 3 );
			}
		}
	}

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

		if ( ! isset( $this->numbers_translation_list[ 'exp' . $exp ] ) ) {
			// calling finalize method of default format object in case of non-existing translation
			return $this->root->number_format_manager->get_default_instance()->format_rich_specific(
				$number,
				$original_number,
				$exp,
				$is_negative,
				$has_context_menu
			);
		}

		// show the numbers in rich name format
		$negative_prefix = ( $is_negative ? "-" : "" );

		return $this->root->output_manager->render( [
			'@render' => 'snippets/number/rich_format',
			'plain_number' => $negative_prefix . $original_number,
			'rich_number_content' => $number
				. ( 0 < $exp
					? '&nbsp;' . $this->numbers_translation_list[ 'exp' . $exp ]
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

		if ( ! isset( $this->numbers_translation_list[ 'exp' . $exp ] ) ) {
			// calling finalize method of default format object in case of non-existing translation
			return $this->root->number_format_manager->get_default_instance()->format_plain_specific(
				$number,
				$original_number,
				$exp,
				$is_negative
			);
		}

		// show the numbers in plain name format
		return $exp > 0
			? $number . ' ' . $this->numbers_translation_list[ 'exp' . $exp ]
			: $number;
	}

	/**
	 * Unformats number formatted in name format
	 *
	 * @param string $number
	 * @return string | false
	 */
	public function unformat_specific( string $number ) {
		$match_list = [];
		// matching groups
		// 1 - number before exponent (including minus)
		// 2 - number in decimal places
		// 3 - name of number
		$pattern = '/([-]?[0-9]+)[' . $this->regexp_separator . ']*([0-9]*)\s*([\w]*)/';

		if ( \preg_match( $pattern, $number, $match_list ) ) {

			if ( ! isset( $this->number_name_matrix[ $match_list[ 3 ] ] ) ) {
				return false;
			}

			$decimal_scale = \strlen( $match_list[ 2 ] );
			$exponent_scale = $this->number_name_matrix[ $match_list[ 3 ] ];

			// number of zeros added is scale of exponent identified by name
			// minus number of decimal places
			$zeros_added = $exponent_scale - \strlen( $match_list[ 2 ] );

			if ( $exponent_scale <= $decimal_scale ) {
				// producing full number with decimal point moved
				return $match_list[ 1 ]
					. \substr( $match_list[ 2 ], 0, $exponent_scale )
					. ( $exponent_scale < $decimal_scale
						? '.' . \substr( $match_list[ 2 ], $exponent_scale )
						: ''
					);
			}
			// producing full number with adding zeros to number with decimal point vanished
			return $match_list[ 1 ] . $match_list[ 2 ] . \str_pad( '',  $zeros_added, '0' );
		}

		return false;
	}

	/**
	 * Simple getter for the number-name-matrix
	 * @return array the number-name-matrix
	 */
	protected function get_number_name_matrix() {
		return $this->number_name_matrix;
	}
}
