<?php

namespace Lasso\Module\Number;

/**
 * Number format manager class
 *
 * @author Veronika Pavlisin <veronika.pavlisin@lookiassembly.de>
 * @version    1.20
 * @date       21.05.2022
 */
class Format_Manager
extends \Lasso\Core\Component {

	/** @var array */
	private array $instance_list;

	/** @var \Lasso\Module\Number\Format */
	private ?\Lasso\Module\Number\Format $default_instance = null;

	/** @var \Lasso\Module\Number\Format */
	private ?\Lasso\Module\Number\Format $current_instance = null;

	/**
	 * {@inheritDoc}
	 */
	protected function init() {
		// parent init
		parent::init();
		$this->instance_list = [];

		// cache available format objects including the default one
		$this->cache_available_instances();
	}

	/**
	 * Loads cache of number format objects and default format object
	 * based on existing preference values
	 */
	private function cache_available_instances() : void {
		$preference_value_handler = $this->root->preference_value_handler;

		$format_list = $preference_value_handler->by_preference_and_owner_type(
			\Lasso\Core\Hook\Request\User::class,
			\Lasso\Module\Preference\Enum\Preference::NUMBER_FORMAT,
			true
		);

		foreach ( $format_list as $format ) {
			// read and cache format object
			$format_object = $this->get_format_object( $format[ 'value' ] );
			if ( $format[ 'default' ] ) {
				$this->default_instance = $format_object;
			}
		}
	}

	/**
	 * Returns number format object based on number format name
	 *
	 * @param string $format number format name
	 * @return \Lasso\Module\Number\Format number format object
	 *
	 * @throws \Lasso\Core\Exception\Data_Fault
	 */
	public function get_format_object( string $format ) : \Lasso\Module\Number\Format {
		// get class
		$format_class = '\\Lasso\\Module\\Number\\Format\\' . \ucfirst( $format );

		if ( isset( $this->instance_list[ $format_class ] ) ) {
			return $this->instance_list[ $format_class ];
		}

		if ( ! class_exists( $format_class ) ) {
			throw new \Lasso\Core\Exception\Data_Fault(
				'Unknown format class ' . $format_class
			);
		}
		// return new instance
		return $this->instance_list[ $format_class ]
			= new $format_class( \Lasso\Core\Factory\Root::instance()->current );
	}

	/**
	 * Returns number format object based on preference value associated with request owner
	 *
	 * @param \Lasso\Core\Request_Source\ISource_Request $request
	 * @return \Lasso\Module\Number\Format
	 */
	public function get_instance(
		\Lasso\Core\Request_Source\ISource_Request $request
	) : \Lasso\Module\Number\Format {

		$number_format = $this->root->preference_handler->value(
			$request,
			\Lasso\Module\Preference\Enum\Preference::NUMBER_FORMAT
		);

		// cache returned format object as current
		return $this->current_instance = $this->get_format_object( $number_format );
	}

	/**
	 * Returns cached default format object
	 *
	 * @return \Lasso\Module\Number\Format
	 */
	public function get_default_instance() : \Lasso\Module\Number\Format {
		return $this->default_instance;
	}

	/**
	 * Returns cached current format object
	 *
	 * @return \Lasso\Module\Number\Format
	 */
	public function get_current_instance() : \Lasso\Module\Number\Format {
		// if format object was not yet called/used, use default format object as current
		if ( ! $this->current_instance ) {
			$this->current_instance = $this->default_instance;
		}
		return $this->current_instance;
	}

	/**
	 * Unformats number by trying to unformat with all of available format objects
	 * (current object as first)
	 *
	 * @param string $number
	 * @param Format $current (optional)
	 * @return string | false if unformatting was not successful
	 *
	 * @throws \Lasso\Core\Exception\Not_Implemented in case of unknown format
	 */
	public function unformat( string $number, Format $current = null ) {
		// get current format object in case it wasn't supplied
		$current ??= $this->get_current_instance();

		//check if number is not full number already and does not need any unformatting
		if ( false !== ( $full_number = $current->is_full_number( $number ) ) ) {
			return $full_number;
		}

		// current (user's) format is tried as first
		$current_result = $current->unformat_specific( $number );
		if ( false !== $current_result ) {
			return $current_result;
		}
		$current_format_class = $current->class_type();

		// try unformatting via every other available format except current
		foreach ( $this->instance_list as $format_object ) {
			if ( $format_object->class_type() != $current_format_class ) {
				$result = $format_object->unformat_specific( $number );

				if ( false !== $result ) {
					return $result;
				}
			}
		}

		// throw exception if none of available formats was able to unformat the number
		throw new \Lasso\Core\Exception\Not_Implemented( 'Unable to unformat input ' . $number );
	}

	/**
	 * Compares two numbers (can be full or in known formats)
	 * and returns
	 * neutral (0) - numbers are same
	 * positive level (1-3) - when first number is greater
	 * negative level (1-3) - when second number is greater
	 *
	 * @param string $number1
	 * @param string $number2
	 * @return int
	 *
	 * @throws \Lasso\Core\Exception\Data_Fault
	 */
	public function compare( string $number1, string $number2 ) : int {

		$math = $this->root->math;

		$full_number1 = $this->unformat( $number1 );
		if ( false == $full_number1 ) {
			throw new \Lasso\Core\Exception\Data_Fault(
				'unable to transform ' . $number1 . ' into full number'
			);
		}

		$full_number2 = $this->unformat( $number2 );
		if ( false == $full_number2 ) {
			throw new \Lasso\Core\Exception\Data_Fault(
				'unable to transform ' . $number2 . ' into full number'
			);
		}

		// return 0 in case of equality
		if ( $full_number1 === $full_number2 ) {
			return 0;
		}

		$current = $this->get_current_instance();

		// get information about numbers being negative
		$negative1 = \substr( trim( $number1 ), 0, 1 ) == '-' ? true : false;
		$negative2 = \substr( trim( $number2 ), 0, 1 ) == '-' ? true : false;

		$exp = 0;
		// reducing only has meaning if both numbers have same polarity
		if ( $negative1 && $negative2 || !$negative1 && !$negative2 ) {
			list( $reduced_number1, $exp1 ) = $current->reduce_base( $full_number1 );
			list( $reduced_number2, $exp2 ) = $current->reduce_base( $full_number2 );
			// determine smallest common exponent
			if ( $exp1 > $exp2 ) {
				// if first exponent is bigger
				$exp = $exp2;
				// first number will gain zeros that could not have been removed from second number
				$full_number1 = $reduced_number1 . str_pad( '', $exp1 - $exp2, '0' );
				$full_number2 = $reduced_number2;
			} else {
				// if second exponent is bigger or same
				$exp = $exp1;
				$full_number1 = $reduced_number1;
				// second number will gain zeros that could not have been removed from first number
				$full_number2 = $reduced_number2 . str_pad( '', $exp2 - $exp1, '0' );
			}
		}

		// determine scale of difference
		$difference = $math->absolute( $math->sub( $full_number1, $full_number2 ) );
		$difference_scale = $current->get_scale( $difference ) + $exp;

		// determine which of numbers is smaller
		if ( $negative1 && !$negative2 ) {
			// second number is positive and first number is negative, thus first is smaller
			$smaller_number = $full_number1;
			$level_polarity = -1;
		} elseif ( !$negative1 && $negative2 ) {
			// first number is positive and second number is negative, thus second is smaller
			$smaller_number = $full_number2;
			$level_polarity = 1;
		} elseif ( !$negative1 && !$negative2 ) {
			// both numbers are positive
			$level_polarity = $math->comp( $full_number1, $full_number2 );
			$smaller_number = $level_polarity == 1
				? $full_number2
				: $full_number1;
		} else {
			// both numbers are negative, for purposes of scale greater is taken as smaller
			$level_polarity = $math->comp( $full_number1, $full_number2 );
			$smaller_number = $level_polarity == 1
				? $full_number1
				: $full_number2;
		}

		$smaller_scale = $current->get_scale( $math->absolute( $smaller_number ) ) + $exp;

		// resulting level is determined based on comparing
		// difference scale to smaller number scale
		if ( $difference_scale < 3 ) {
			// level 1 - difference scale is max 2
			$level = 1;
		} elseif ( $difference_scale < $smaller_scale ) {
			// level 2 - difference scale is higher than 2 and smaller than smaller number scale
			$level = 2;
		} else {
			// level 3 - difference scale is equal or higher than smaller number scale
			$level = 3;
		}

		return $level_polarity * $level;
	}
}
