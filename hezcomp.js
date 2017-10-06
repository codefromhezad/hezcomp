( function() {

	/**
	 * VALUES CONSTS
	**/
	window.HezCompSystemStatus = {
		STOPPED: 1,
		PAUSED: 2,
		RUNNING: 3,
	};

	window.HezCompErrorStatus = {
		OK: 1,
		INFO: 2,
		WARNING: 3,
		FATAL: 4,
	};



	/**
	 * MAIN COMPUTER OBJECT
	**/

	window.HezComp = {

		/**
	 	* DEVELOPMENT / FAILSAFES CONSTS
		**/
		DEBUG_IS_ACTIVE: false,

		MIN_ERROR_LEVEL_FOR_ABORT: HezCompErrorStatus.FATAL,

		MAX_CYCLES_BEFORE_CHECK_FOR_FAILSAFE_ABORT: 200,
		MAX_ERRORS_PER_MAX_FAILSAFE_CYCLES_BEFORE_ABORT: 175, /* This value should ALWAYS BE INFERIOR TO MAX_CYCLES_BEFORE_CHECK_FOR_FAILSAFE_ABORT */
		MIN_ERROR_LEVEL_FOR_FAILSAFE_LOG: HezCompErrorStatus.WARNING,

		

		/**
	 	* RUNNING SYSTEM STATE VARIABLES
		**/
		system_name: null,
		is_running: false,
		is_booted: false,
		current_cpu_cycle_value: 0,

		debug_dom_container: null,
		debug_dom_els: {},
		failsafe_start_cycle_value: null,
		failsafe_num_errors_value: 0,



		/**
	 	* LOADED ARCH DEFINITION AND RUNTIME STATE
		**/
		system_template: {},
		system_runtime: {},


		
		/**
	 	* HELPERS
		**/
		intToHex: function(int_v) {
			return int_v.toString(16);
		},

		hexToInt: function(hex_str) {
			return parseInt(hex_str, 16);
		},

		isObject: function(test_var) {
			return (typeof test_var === "object") && test_var.constructor.toString().indexOf("Object") != -1;
		},



		/**
	 	* ERROR HANDLER
		**/
		handle_error: function(error_code, error_message) {
			var console_method = "log";
			var error_desc = "info";

			try {
				switch( error_code ) {
					case HezCompErrorStatus.FATAL:
						console_method = "error";
						error_desc = "Fatal error";
						break;
					case HezCompErrorStatus.WARNING:
						console_method = "warn";
						error_desc = "Warning";
						break;
					case HezCompErrorStatus.INFO:
						console_method = "info";
						error_desc = "Info";
						break;
					default:
						console_method = "log";
						error_desc = "Unkown error";
				}
			} finally {
				if( error_code >= HezComp.MIN_ERROR_LEVEL_FOR_FAILSAFE_LOG ) {
					HezComp.failsafe_num_errors_value += 1;
				}

				if( error_code >= HezComp.MIN_ERROR_LEVEL_FOR_ABORT ) {
					throw new Error(error_desc+": "+error_message);
				} else {
					console[console_method](error_desc+": "+error_message);
				}
			}
		},




		/**
	 	* DEBUG STUFF
		**/
		debug_mode: function(set_mode) {
			HezComp.DEBUG_IS_ACTIVE = set_mode;

			if( HezComp.DEBUG_IS_ACTIVE && (! HezComp.debug_dom_container) ) {

				HezComp.handle_error(HezCompErrorStatus.WARNING, 'Debug mode has a huge (negative) impact on performances. Consider deactivate it to test your architecture performance in realistic conditions');
				
				var body_el = document.querySelector('body');

				body_el.innerHTML += '<div id="hezcomp-debug-container">' +
					'<div class="hezcomp-debug-item">'+
						'ARCH Name: <span id="hezcomp-debug-arch-name"></span>' +
					'</div>' +
					'<div class="hezcomp-debug-item">'+
						'CPU Cycle: <span id="hezcomp-debug-cpu-cycle-value"></span>' +
					'</div>' +
				'</div>';
				
				HezComp.debug_dom_container = document.getElementById('hezcomp-debug-container');
				HezComp.debug_dom_els = {
					arch_name: document.getElementById('hezcomp-debug-arch-name'),
					cpu_cycle_value: document.getElementById('hezcomp-debug-cpu-cycle-value'),
				}
			}
		},


		/**
	 	* ARCH LOADING METHODS
		**/
		check_template_validity: function(template_object) {

			/**
			 * @TODO
			 * Throw Exception if template_object is invalid.
			 * Add an error message explaining what is wrong 
			 * (Missing parameter ? Wrong parameter format ?)
			 *
			 * Check CHIP 8 template to see basic mandatory parameters
			 *
			**/

			if( ! HezComp.isObject(template_object) ) {
				return false;
			}
			
			return true;
		},

		load_template: function(template_object) {

			if( ! HezComp.check_template_validity(template_object) ) {
				HezComp.handle_error(HezCompErrorStatus.FATAL, 'Invalid template_object passed to load_template()');
			}

			HezComp.system_template = {};
			HezComp.system_template = template_object.arch_definition;
			HezComp.system_name = template_object.name;



			// Init System Memory 
			var mem_def = HezComp.system_template.memory;
			HezComp.system_runtime.memory = [];
			for(var i = 0; i < mem_def.size; i ++) {
				HezComp.system_runtime.memory.push(0);
			}



			// Init system registers
			HezComp.system_runtime.registers = {};
			for(var register_slug in HezComp.system_template.registers) {
				var reg_def = HezComp.system_template.registers[register_slug];

				if( reg_def.size > 1 ) {
					HezComp.system_runtime.registers[register_slug] = [];

					for(var i = 0; i < reg_def.size; i++) {
						HezComp.system_runtime.registers[register_slug].push(0);
					}
				} else {
					HezComp.system_runtime.registers[register_slug] = 0;
				}
			}
			


			// Init system graphics if necessary
			if( HezComp.system_template.graphics ) {
				
				HezComp.system_runtime.graphics = HezComp.system_template.graphics;
				HezComp.system_runtime.graphics.screen = new Screen(
					HezComp.system_template.graphics.dom_screen_id,
					HezComp.system_template.graphics.resolution,
					HezComp.system_template.graphics.color_depth,
					HezComp.system_template.graphics.pixel_size
				);

				HezComp.system_runtime.graphics.screen.init();
			}



			// call load callback
			if( HezComp.system_template.listeners && HezComp.system_template.listeners.on_load ) {
				HezComp.system_template.listeners.on_load(HezComp.system_runtime);
			}


			
		},

		


		/**
	 	* EMULATION LIFECYCLE METHODS
		**/
		emulate_cycle: function(delta_timer) {
			if( HezComp.DEBUG_IS_ACTIVE ) {
				HezComp.debug_dom_els.cpu_cycle_value.innerHTML = HezComp.current_cpu_cycle_value;
			}
			HezComp.current_cpu_cycle_value += 1;
			

			if( HezComp.failsafe_start_cycle_value === null ) {
				HezComp.failsafe_start_cycle_value = HezComp.current_cpu_cycle_value;
				HezComp.failsafe_num_errors_value = 0;
			}

			var opcode = HezComp.system_template.cycle_functions.get_current_opcode(HezComp.system_runtime);
			
			// Process cycle
			HezComp.system_template.cycle_functions.process_opcode(HezComp.system_runtime, opcode);


			// call after_cycle callback
			if( HezComp.system_template.listeners && HezComp.system_template.listeners.on_after_cycle ) {
				HezComp.system_template.listeners.on_after_cycle(HezComp.system_runtime);
			}

			// Kill exection if too much emulation errors
			if( HezComp.failsafe_num_errors_value >= HezComp.MAX_ERRORS_PER_MAX_FAILSAFE_CYCLES_BEFORE_ABORT ) {
				HezComp.handle_error(HezCompErrorStatus.FATAL, 'Too much emulation errors ('+HezComp.MAX_ERRORS_PER_MAX_FAILSAFE_CYCLES_BEFORE_ABORT+' errors detected for '+HezComp.current_cpu_cycle_value+' CPU cycles processed)');
			}

			if( HezComp.current_cpu_cycle_value >= HezComp.failsafe_start_cycle_value + HezComp.MAX_CYCLES_BEFORE_CHECK_FOR_FAILSAFE_ABORT ) {
				HezComp.failsafe_start_cycle_value = null;
				HezComp.failsafe_num_errors_value = 0;
			}

		},

		start_emulation_loop: function() {
			if( HezComp.DEBUG_IS_ACTIVE ) {
				HezComp.debug_dom_els.arch_name.innerHTML = HezComp.system_name;
			}

			var start_time = null;
			var cycle_step = function(timestamp) {
				if( HezComp.is_running ) {
					if( ! start_time ) {
						start_time = timestamp;
					}

					var delta_timer = timestamp - start_time;
					
					HezComp.emulate_cycle(delta_timer);
					window.requestAnimationFrame(cycle_step);
				}
			};
			cycle_step(start_time);
		},

		system_reset: function() {
			HezComp.current_cpu_cycle_value = 0;
			HezComp.failsafe_start_cycle_value = null;
			HezComp.failsafe_num_errors_value = 0;

			if( HezComp.system_template.listeners && HezComp.system_template.listeners.on_reset ) {
				HezComp.system_template.listeners.on_reset(HezComp.system_runtime);
			}
		},

		system_run: function() {
			if( ! HezComp.is_booted ) {
				HezComp.is_booted = true;
				HezComp.system_reset();
			}
			
			if( ! HezComp.is_running ) {
				HezComp.is_running = true;
				HezComp.start_emulation_loop();
			} else {
				HezComp.handle_error(HezCompErrorStatus.WARNING, 'Called system_run() twice (System was already running)');
			}
		},

		system_pause: function() {
			HezComp.is_running = false;
		},

	};

})();