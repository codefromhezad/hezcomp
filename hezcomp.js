( function() {

	/**
	 * MAIN COMPUTER OBJECT
	**/

	window.HezComp = {

		/* HezComp CONSTS */
		STATUS_OK: 1,
		STATUS_INFO: 2,
		STATUS_WARNING: 3,
		STATUS_FATAL: 4,
		


		/* Administrative variables */
		system_name: null,



		/* Loaded Arch Definition and Runtime state*/
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



		/* Error Handler */
		handle_error: function(error_code, error_message) {
			var console_method = "log";
			var error_desc = "info";
			var abort_level = HezComp.STATUS_FATAL;

			try {
				switch( error_code ) {
					case HezComp.STATUS_FATAL:
						console_method = "error";
						error_desc = "Fatal error";
						break;
					case HezComp.STATUS_WARNING:
						console_method = "warn";
						error_desc = "Warning";
						break;
					case HezComp.STATUS_INFO:
						console_method = "info";
						error_desc = "Info";
						break;
					default:
						console_method = "log";
						error_desc = "Unkown error";
				}
			} finally {
				if( error_code >= abort_level ) {
					throw new Error(error_desc+": "+error_message);
				} else {
					console[console_method](error_desc+": "+error_message);
				}
			}
		},


		/* Arch templates loading methods */
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
				HezComp.handle_error(HezComp.STATUS_FATAL, 'Invalid template_object passed to load_template()');
				console.log('called')
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
				var resolution = HezComp.system_template.graphics.resolution;

				HezComp.system_runtime.graphics = HezComp.system_template.graphics;
				HezComp.system_runtime.graphics.screen = new Screen(
					HezComp.system_template.graphics.dom_screen_id,
					resolution,
					HezComp.system_template.graphics.color_depth,
					HezComp.system_template.graphics.pixel_size
				);

				HezComp.system_runtime.graphics.screen.init();
			}



			// call load callback
			if( HezComp.system_template.listeners && HezComp.system_template.listeners.on_load ) {
				HezComp.system_template.listeners.on_load(HezComp.system_runtime);
			}


			// call reset callback
			if( HezComp.system_template.listeners && HezComp.system_template.listeners.on_reset ) {
				HezComp.system_template.listeners.on_reset(HezComp.system_runtime);
			}
		},




		/* HezComp constructor / init method */
		init: function(template_object) {
			HezComp.load_template(template_object);
		},


		emulate_cycle: function() {
			var opcode = HezComp.system_template.cycle_functions.get_current_opcode(HezComp.system_runtime);

			// Process cycle
			HezComp.system_template.cycle_functions.process_opcode(opcode);


			// call after_cycle callback
			if( HezComp.system_template.listeners && HezComp.system_template.listeners.on_after_cycle ) {
				HezComp.system_template.listeners.on_after_cycle(HezComp.system_runtime);
			}
		},
	};

})();