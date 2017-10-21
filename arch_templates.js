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

		arch_functions: { /* MANDATORY: How CPU cycles are handled */
			process_cycle: function(system_runtime) {

				// Get current opcode 
				var pc = system_runtime.registers.PC;
				var sp = system_runtime.registers.SP;
				var V  = system_runtime.registers.V;
				var stack = system_runtime.registers.stack;

				var opcode = system_runtime.memory[pc] << 8 | system_runtime.memory[pc + 1];

				// @TODO? : pc += 2
				var NNN = opcode & 0x0fff;
				var NN  = opcode & 0x00ff;
				var N   = opcode & 0x000f;
				var X   = (opcode & 0x0f00) >> 8;
				var Y   = (opcode & 0x00f0) >> 4;

				// Actually process opcode
				var hex_opcode = HezComp.intToHex(opcode);
				var end_opcode = hex_opcode.substr(1);
				var int_end_opcode = HezComp.hexToInt(end_opcode);

				main_switch:
				switch(hex_opcode[0]) {
					case 0:
					    switch(end_opcode) {
					    	case "0e0":
					    		// Clear screen
					    		// @TODO
					    		break main_switch;
					    	case "0ee":
					    		// Return from a subroutine 
					    		
					    		--sp;			// 16 levels of stack, decrease stack pointer to prevent overwrite
								pc = stack[sp];	// Put the stored return address from the stack back into the program counter					
								pc += 2;		// Don't forget to increase the program counter!

					    		break main_switch;
					    	default:
					    		// Calls RCA 1802 program at address NNN. Not necessary for most ROMs.
					    		// @TODO ?
					    		break main_switch;
					    }
					    break;

					case 1: // Jump to NNN

						pc = NNN;

						break;

					case 2: // Call subroutine at NNN

						stack[sp] = pc;
						++ sp;
						pc = NNN;

						break;
	
					case 3: // Skip next instruction if Vx == NN.

						if( V[X] == NN ) {
							pc += 2;
						}

						break;

					case 4: // Skip next instruction if Vx != NN.

						if( V[X] != NN ) {
							pc += 2;
						}

						break;

					case 5: // Skip next instruction if Vx == Vy.
						

						if( V[X] == V[Y] ) {
							pc += 2; 
						}
						
						break;

					case 6: // Set Vx to NN
						
						V[X] = NN; 
						
						break;
						
					case 7: // Add NN to Vx
						
						V[X] += NN; 
						
						break main_switch; 

					case 8:

						switch(N) {
							case 0x0: V[X] = V[Y]; break main_switch; 	   // Vx = Vy
							case 0x1: V[X] = V[X] | V[Y]; break main_switch; // Vx = Vx | Vy
							case 0x2: V[X] = V[X] & V[Y]; break main_switch; // Vx = Vx & Vy
							case 0x3: V[X] = V[X] ^ V[Y]; break main_switch; // Vx = Vx xor Vy
							case 0x4:
								V[0xf] = (V[X] + V[Y] > 0xff) ? 1 : 0; 	   // VX += Vy (Handling carry bit)
								V[X] += V[Y];
								break main_switch;
							case 0x5:
								V[0xf] = V[X] > V[Y] ? 1 : 0; 	   		   // VX -= Vy (Handling carry bit)
								V[X] -= V[Y];
								break main_switch;
							case 0x6:
								V[0xf] = (V[X] & 0x1 != 0) ? 1 : 0;			// Vx /= 2 (Handling carry bit)
								V[X] /= 2;
								break main_switch;
							case 0x7:
								V[0xf] = V[Y] > V[X] ? 1 : 0; 				// Vy -= Vx (Handling carry bit)
								V[Y] -= V[X];
								break main_switch;
							case 0xe:
								V[0xf] = (V[X] & 0xf != 0) ? 1 : 0; 		// Vx *= 2 (Handling carry bit)
								V[X] *= 2;
								break main_switch;
						}
						

						

						break main_switch;

					default:
						HezComp.handle_error(HezCompErrorStatus.WARNING, "Unknown opcode: 0x" + HezComp.intToHex(opcode));
				}

				system_runtime.registers.pc = pc;
				system_runtime.registers.sp = sp;
				system_runtime.registers.V  = V;
				system_runtime.registers.stack = stack;
			},

			load_binary_data: function(system_runtime, binary_string) {
				var array_buffer = new ArrayBuffer(binary_string.length * 2); // 2 bytes for each char
				var buffer_view = new Uint8Array(array_buffer);
				for(var i = 0, str_len=binary_string.length; i < str_len; i++) {
					buffer_view[i] = binary_string.charCodeAt(i);
				}

				for (var i = 0; i < buffer_view.byteLength; i++) {
					system_runtime.memory[i + 512] = buffer_view[i]; // @TODO / @TOCHECK : + 513 instead of + 512 ?
				}
			}
		},

		listeners: {

			on_reset: function(system_runtime) { /* reset is called on machine start and/or machine reset */

				/* Load CHIP 8 Font Map */
				var font_map = new Array(
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
				
				for (var i=0;i<font_map.length;i++) {
					system_runtime.memory[i] = font_map[i];
				}

				/* Reset Registers */
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
		}
	},


};