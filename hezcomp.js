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
		debug_same_following_errors_num: 0,
		debug_last_error: {},
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
		kill: function(message) {
			throw new Error(message);
		},

		handle_error: function(error_code, error_message) {
			var console_method = "log";
			var error_desc = "info";
			var fa_class = "fa-comment";

			if( ! HezComp.DEBUG_IS_ACTIVE ) {
				if( error_code >= HezComp.MIN_ERROR_LEVEL_FOR_ABORT ) {
					throw new Error(error_desc+": "+error_message);
				}

				return;
			}

			switch( error_code ) {
				case HezCompErrorStatus.FATAL:
					console_method = "error";
					error_desc = "Fatal error";
					fa_class = "fa-times";
					break;
				case HezCompErrorStatus.WARNING:
					console_method = "warn";
					error_desc = "Warning";
					fa_class = "fa-exclamation-triangle";
					break;
				case HezCompErrorStatus.INFO:
					console_method = "info";
					error_desc = "Info";
					fa_class = "fa-info-circle";
					break;
				default:
					console_method = "log";
					error_desc = "Unkown error";
					fa_class = "fa-comment";
			}

			if( error_code >= HezComp.MIN_ERROR_LEVEL_FOR_FAILSAFE_LOG ) {
				HezComp.failsafe_num_errors_value += 1;
			}

			var log_wrapper = HezComp.debug_dom_els.log_container;

			if( HezComp.debug_last_error && HezComp.debug_last_error.console_method == console_method && HezComp.debug_last_error.error_message == error_message ) {
				HezComp.debug_same_following_errors_num += 1;
			} else {
				HezComp.debug_same_following_errors_num == 0;
			}

			if( HezComp.debug_same_following_errors_num > 0 ) {
				var num_elm = document.querySelector('#hezcomp-debug-log-container .hezcomp-debug-log-item:last-child .num');
				num_elm.innerHTML = '['+ (HezComp.debug_same_following_errors_num + 1) +']';
			} else {
				log_wrapper.innerHTML += '<div class="hezcomp-debug-log-item log-type-'+console_method+'"><i class="fa '+fa_class+' fa-fw" aria-hidden="true"></i><span class="msg">'+error_message+'<span class="num"></span></span></div>';
			}
			
			if( error_code >= HezComp.MIN_ERROR_LEVEL_FOR_ABORT ) {
				log_wrapper.innerHTML += '<div class="hezcomp-debug-log-item log-type-'+console_method+'"><i class="fa '+fa_class+' fa-fw" aria-hidden="true"></i><span class="msg">'+error_message+'<span class="num"></span></span></div>';
				HezComp.kill(error_message);
			}

			HezComp.debug_last_error = {
				console_method: console_method,
				error_message: error_message
			};
		},




		/**
	 	* DEBUG STUFF
		**/

		debug_mode: function(set_mode) {
			HezComp.DEBUG_IS_ACTIVE = set_mode;

			if( HezComp.DEBUG_IS_ACTIVE && (! HezComp.debug_dom_container) ) {

				var body_el = document.querySelector('body');

				body_el.innerHTML += '<div id="hezcomp-debug-container">' +
					'<div class="hezcomp-debug-title">Debug/Log</div>'+
					'<div id="hezcomp-debug-log-container"></div>'+
				'</div>';
				
				HezComp.debug_dom_container = document.getElementById('hezcomp-debug-container');
				HezComp.debug_dom_els = {
					log_container: document.getElementById('hezcomp-debug-log-container'),
				}

				HezComp.debug_same_following_errors_num = 0;
				HezComp.debug_last_error = {};
				HezComp.handle_error(HezCompErrorStatus.LOG, 'Debug mode has a huge (negative) impact on performances. Consider deactivate it to test your architecture performance in realistic conditions');
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

			
		},

		


		/**
	 	* EMULATION LIFECYCLE METHODS
		**/
		load_rom: function(file_path) {
			var oReq = new XMLHttpRequest();
			oReq.open("GET", file_path, true);
			oReq.overrideMimeType("text/plain; charset=x-user-defined");
			// oReq.responseType = "arraybuffer";

			/* @TODO: Handle request errors */
			oReq.onload = function (oEvent) {
				var binary_string = oReq.response; // Note: not oReq.responseText
				
				if (binary_string) {
					HezComp.system_template.arch_functions.load_binary_data(HezComp.system_runtime, binary_string);
					HezComp.system_run();
				} else {
					HezComp.handle_error(HezCompErrorStatus.FATAL, "Can't find any binary data in file '"+file_path+"'");
				}
			};

			oReq.send();
		},

		emulate_cycle: function(delta_timer) {
			HezComp.current_cpu_cycle_value += 1;

			if( HezComp.failsafe_start_cycle_value === null ) {
				HezComp.failsafe_start_cycle_value = HezComp.current_cpu_cycle_value;
				HezComp.failsafe_num_errors_value = 0;
			}
			
			// Process cycle
			HezComp.system_template.arch_functions.process_cycle(HezComp.system_runtime);


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
			HezComp.handle_error(HezCompErrorStatus.INFO, "System name: " + HezComp.system_name);

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