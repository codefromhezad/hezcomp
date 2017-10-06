/**
 * ARCH TEMPLATES
**/
window.HezCompTemplate_CHIP8 = {
	name: "CHIP8", /* MANDATORY */

	/* FOR REFERENCE : CHIP8 memory map */
	/* */
	// 0x000-0x1FF - Chip 8 interpreter (contains font set in emu)
	// 0x050-0x0A0 - Used for the built in 4x5 pixel font set (0-F)
	// 0x200-0xFFF - Program ROM and work RAM


	arch_definition: {  /* MANDATORY */

		memory: { size: 4096 }, /* MANDATORY */

		registers: { /* MANDATORY */
			V:  { size: 16 }, // General purpose / Data registers
			I:  { size: 1  }, // Index / Address register
			PC: { size: 1  }, // Program counter
			
			delay_timer: { size: 1 }, // This timer is intended to be used for timing the events of games. Its value can be set and read.
			sound_timer: { size: 1 }, // This timer is used for sound effects. When its value is nonzero, a beeping sound is made.

			stack: { size: 16 }, // Opcodes stack 
			SP: { size: 1 }, // Stack Pointer

			key: { size: 16 } // the Chip 8 has a HEX based keypad (0x0-0xF), you can use an array to store the current state of the key.
		},

		opcodes: { /* MANDATORY: Defines how the machines CPU works */

		},

		graphics: {
			color_depth: 1,
			resolution: [64, 32],
			dom_screen_id: "screen",
			pixel_size: 4,
		},

		cycle_functions: { /* MANDATORY: How CPU cycles are handled */
			get_current_opcode: function(system_runtime) {
				var pc = system_runtime.registers.PC;
				return system_runtime.memory[pc] << 8 | system_runtime.memory[pc + 1];
			},

			process_opcode: function(system_runtime, opcode) {
				if( opcode === null || opcode === undefined ) {
					HezComp.handle_error(HezCompErrorStatus.FATAL, "NULL or undefined opcode. Can't process.");
				}

				switch(opcode & 0xF000) {
					case 0xA000: // ANNN: Sets I to the address NNN
					    system_runtime.registers.I = opcode & 0x0FFF;
					    system_runtime.registers.PC += 2;
					    break;

					default:
						HezComp.handle_error(HezCompErrorStatus.WARNING, "Unknown opcode: 0x" + HezComp.intToHex(opcode));
				}
			}
		},

		listeners: {
			on_load: function(system_runtime) { /* load is called only once when loading an Arch template */

				/* Load CHIP 8 Font Map */
				system_runtime.font_map = new Array(
					0xF0, 0x90, 0x90, 0x90, 0xF0,	// 0 
					0x20, 0x60, 0x20, 0x20, 0x70,	// 1
					0xF0, 0x10, 0xF0, 0x80, 0xF0,	// 2
					0xF0, 0x10, 0xF0, 0x10, 0xF0,	// 3
					0x90, 0x90, 0xF0, 0x10, 0x10, 	// 4
					0xF0, 0x80, 0xF0, 0x10, 0xF0,	// 5
					0xF0, 0x80, 0xF0, 0x90, 0xF0,	// 6
					0xF0, 0x10, 0x20, 0x40, 0x40,	// 7
					0xF0, 0x90, 0xF0, 0x90, 0xF0,	// 8
					0xF0, 0x90, 0xF0, 0x10, 0xF0,	// 9
					0xF0, 0x90, 0xF0, 0x90, 0x90,	// A
					0xE0, 0x90, 0xE0, 0x90, 0xE0,	// B
					0xF0, 0x80, 0x80, 0x80, 0xF0,	// C
					0xE0, 0x90, 0x90, 0x90, 0xE0,	// D
					0xF0, 0x80, 0xF0, 0x80, 0xF0,	// E
					0xF0, 0x80, 0xF0, 0x80, 0x80	// F
				);
				
				for (var i=0;i<system_runtime.font_map.length;i++) {
					system_runtime.memory[i] = system_runtime.font_map[i];
				}
			},

			on_reset: function(system_runtime) { /* reset is called on machine start and/or machine reset */
				system_runtime.registers.PC = 0x200;
				system_runtime.registers.I = 0;
				system_runtime.registers.SP = 0;
				system_runtime.registers.delay_timer = 0;
				system_runtime.registers.sound_timer = 0;
				system_runtime.opcode = 0;
			},

			on_after_cycle: function(system_runtime) { /* after_cycle is called at the very end of a cpu cycle */
				if(system_runtime.registers.delay_timer > 0)
					--system_runtime.registers.delay_timer;

				if(system_runtime.registers.sound_timer > 0) {
					if(system_runtime.registers.sound_timer == 1) {
				  		console.log("BEEP!\n");
				  	}
					--system_runtime.registers.sound_timer;
				} 
			},
		},
		
	},


};