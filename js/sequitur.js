// Sequitur algorithm (roughly):
//
// 1. Add new symbol to LinkedItem S (creating it if not exists).
// 2. Check digram object for symbol.
//		- if it exists (and isnt the same as the previous symbol):
//			- if it exists as a complete rule:
//					replace new digram in s with non-terminal symbol
//					run step 3.
//					set rule count to 2
//					repeat step 2 given new digram made.
//			- else
//					form a new rule and replace prior and new occurance with said non-terminal symbol.
//					run step 3.
//					set rule count to 2
//		- else add new symbol to digram index.			
//		
// 3. If digram replaced with new non-terminal symbol, and one symbol in digram pointed to a rule:
//			decrease count of rule, and remove if count is now only 1.

function Sequitur()
	{
	//check dependencies:
	if(typeof LinkedItem != "function") throw Error("ERROR: Sequitur: Depends on LinkedItem, but cannot find it.");
	if(typeof HuffmanTree != "function") throw Error("ERROR: Sequitur: Depends on HuffmanTree, but cannot find it.");

	if(!(this instanceof Sequitur)) return new Sequitur();

	//accessible options:
	var settings = {
		rule_utility: {val: 10, check: isFloat}
	};

	//option verification func:
	function isFloat(n) 
		{
		var out = parseFloat(n); 
		return isNaN(out)? null : out; //dont change if not valid int.
		}

	//set option to value, as long as option exists and value passes the associated check:
	this.set = function(s, val)
		{
		var setting = settings[s];
		if(setting) 
			{
			if(typeof val !== "undefined")
				{
				var new_val = setting.check(val);
				if(new_val !== null) setting.val = new_val;
				}
			return setting.val;
			}
		return null;
		}

	//private:
	var s_first, s_last;
	var length = 0;
	var digrams = {};
	var rules = {}; //rules in the form of {"symbol": [reference to first item in rule list], ...}

	//statistic variables which are updated upon running countAllSymbols:
	var longest_rule = 0;
	var rule_count = 0;
	var grammar_length = 0;

	//variable to determine whether new symbols can be added properly:
	var allow_adding = true;

	//keeps track of available rule numbers:
	var RuleNumber = (function()
		{
		var free = [], count = 0;
		function get()
			{
			var n;
			if(free.length == 0) n = count++;
			else { n = free[free.length-1]; free.pop(); }
			return n;
			}
		function erase(n) 
			{
			if(typeof n == "undefined") { count = 0; free = []; }
			else if(n < count) free.push(n); 
			else throw Error("RuleNumber:can't erase unused number.");
			}
		function length()
			{
			return count;
			}
		function realLength()
			{
			return count - free.length;
			}
		return {get: get, erase: erase, length: length, realLength: realLength};
		})()

	//gets rules in an array:
	function getRulesInArray(arr)
		{
		var a = [];
		for(var i = 0; i < arr.length; i++) if(arr[i].length == 2) a.push(arr[i]);
		return a;
		}

	function enforceRuleUtility(each, digrams_to_check) //each is first LinkedItem in a rule we have just substituted symbols for
		{
		each = each.next();
		while(each)
			{
			//look at each rule found within this rule:
			if(each.contents.length == 2)
				{
				var rule = rules[each.contents];

				if(rule.contents.count <= 1)
					{
					//if rule exists only once now at positiion "each":
					//delete digrams representing pairs (potentially) either side of rule
					
					if(each.previous() instanceof LinkedItem && typeof each.previous().contents != "object") 
						{
						delete digrams[each.previous().getContents(2).join("")];
						}

					if(each.next() instanceof LinkedItem)
						{
						delete digrams[each.getContents(2).join("")];
						}

					//delete rule from rules list:
					delete rules[each.contents];
					RuleNumber.erase(~stringToNumber(each.contents));

					//replace "each" with symbols from rule (maintains references to symbols):
					var beginning = each.insertListBefore(rule.next(), -1).previous();	
					each = each.previous();
					each.next().unlink();

					//add/check newly made digrams as a result of this swip:
					if(beginning instanceof LinkedItem && typeof beginning.contents != "object") 
						{
						digrams_to_check.unshift(beginning);
						}
					if(each.next() instanceof LinkedItem)
						{
						digrams_to_check.unshift(each);
						}
					}
				}

			each = each.next();
			}
		}


	function swapSymbolsForRule(digram_pos, rule_str)
		{
		//remove surrounding digrams from index (unless digram_pos has just made use of the same indexed digram):
		var d_prev = digram_pos.previous(), d_next = digram_pos.next();
		var new_digram = digram_pos.getContents(2).join(""), delete_me;
		if(d_prev && typeof d_prev.contents != "object") 
			{
			delete_me = d_prev.getContents(2).join("")
			if(delete_me !== new_digram) delete digrams[delete_me];
			}
		if(d_next.next())
			{
			delete_me = d_next.getContents(2).join("")
			if(delete_me !== new_digram) delete digrams[delete_me];
			}

		//lower count of symbols being removed in place of rule:
		if(digram_pos.contents.length == 2) --rules[digram_pos.contents].contents.count;
		if(d_next.contents.length == 2) --rules[d_next.contents].contents.count;

		//swap digram with rule:
		var rule = rules[rule_str];
		rule.contents.count++;
		digram_pos.contents = rule_str;
		digram_pos.next().unlink();

		return digram_pos;
		}


	//functions to convert between strings and numbers:
	function numberToString(number)
		{
		return String.fromCharCode(number >> 16) + String.fromCharCode(number & 0x0000FFFF);
		}
	function stringToNumber(string)
		{
		if(string.length == 2) return (string.charCodeAt(0) << 16) + (string.charCodeAt(1));
		else if(string.length == 1) return string.charCodeAt(0);
		else throw Error("ERROR: Sequitur::stringToNumber: string must have length of 1 or 2.");
		}

	function generateRuleSymbol()
		{
		return numberToString(~RuleNumber.get());
		}

	function addRule(symbol, contents, count)
		{
		if(typeof count == "undefined") count = 0;

		var rule = new LinkedItem({symbol: symbol, count: count});
		rule.insertAfter.apply(rule, contents);
		rules[symbol] = rule;

		return rule;
		}

	function checkDigram(digrams_to_check)
		{
		var d = digrams_to_check.shift(); //take first digram off list.
		var symbol = d.getContents(2).join("");	
		if(symbol.length < 2) throw Error("ERROR: Sequitur::checkDigram: trying to check digram with length of " + symbol.length);

		var pos = digrams[symbol];
		if(pos)
			{
			//if digram overlaps with the copy of it that was found, do nothing:
			if(d.previous() == pos || pos.next() == d) return false;

			//if symbol is part of a complete rule:
			if(pos.previous() instanceof LinkedItem && typeof pos.previous().contents == "object" && typeof pos.next(2) == "undefined")
				{
				var rule_symbol = pos.previous().contents.symbol;

				//swap symbols for rule (deleting other rules if no longer used):
				s_last = swapSymbolsForRule(d, rule_symbol);

				//add new digram to list of digrams to check:
				if(d.previous() && typeof d.previous().contents != "object") digrams_to_check.unshift(d.previous());

				enforceRuleUtility(pos.previous(), digrams_to_check); 
				}
			else
				{
				//make new rule, as symbol already exists in digram but not part of a rule:
				var rule_symbol = generateRuleSymbol();
				var rule_digram = d.getContents(2);
				var rule = addRule(rule_symbol, rule_digram);

				//update digram for symbols now represented by rule:
				digrams[rule_digram.join("")] = rule.next();

				//increment count of any rules in new rule:
				if(rule_digram[0].length == 2) ++rules[rule_digram[0]].contents.count;
				if(rule_digram[1].length == 2) ++rules[rule_digram[1]].contents.count;

				//swap symbols with rule:
				swapSymbolsForRule(pos, rule_symbol);
				s_last = swapSymbolsForRule(d, rule_symbol);

				//add newly made digrams to checklist (to check first):
				if(d.previous() instanceof LinkedItem) digrams_to_check.unshift(d.previous());
				if(pos.next() instanceof LinkedItem && pos.next() != d) digrams_to_check.unshift(pos);
				if(pos.previous() && typeof pos.previous().contents != "object") digrams_to_check.unshift(pos.previous());

				//delete any rules within new rule, that may consequently only be used once now:
				//any new digrams made as a result are checked FIRST, before anything else:
				enforceRuleUtility(rule, digrams_to_check);
				}
			}
		else //else, add it to digram index, and point to its location in S:
			{
			digrams[symbol] = d;
			}
		}

	function add(value) //if value is array or string, run it through loop:
		{
		if(!allow_adding) return false;
		if(typeof value == "string") 
			{
			for(var i = 0; i < value.length; i++) add(value.charCodeAt(i));
			}
		else if(value instanceof Array)
			{
			for(var i = 0; i < value.length; i++) add(value[i]);	
			}
		else
			{
			//value must be 8 bit number (0-255, 0x00 - 0xFF):
			if(value < 0 || value > 255) 
				{
				throw Error("ERROR: Sequitur::Add: value must be an 8 bit number between 0 and 255, but is " + value);
				}
			addSymbol(String.fromCharCode(value));
			return true;
			}
		}

	function addSymbolFirstRun(symbol)
		{
		s_first = new LinkedItem(symbol);
		s_last = s_first;
		++length;
		addSymbol = addSymbolSubsequentRuns;
		}

	function addSymbolSubsequentRuns(symbol)
		{
		++length;
		var current = s_last;
		s_last = s_last.insertAfter(symbol);
		checkLoop([current]);
		}

	//*********************Adding*********************
	function checkLoop(digrams) //checks all digrams in list until none left. Digrams added to list as needed.
		{
		var count = 0;
		while(digrams.length)
			{
			checkDigram(digrams);
			}
		}

	var addSymbol = addSymbolFirstRun;

	function uniqueDigrams(d)
		{
		var o = {}, a = [], dl = d.length;
		for(var i = 0; i < dl; i++)
			{
			if(!o[d[i].getContents(2)]) 
				{ a.push(d[i]); o[d[i].getContents(2)] = true; }
			}
		return a;
		}

	function unravelSymbol(symbol)
		{
		if(symbol.contents.length == 2)
			{
			var replacement = rules[symbol.contents].next().clone(0);

			symbol.insertListAfter(replacement, 0);
			symbol = symbol.next();
			symbol.previous().unlink();
			return symbol;
			}
		else return false;
		}

	//unravels a given symbol or string, and returns array with all of the symbols represented by it if its a rule:
	function unravel(output, a, i) //if arraybuffer or uint8array is provided, it'll be appended too.
		{
		if(typeof a.length == "undefined") a = [];
		if(typeof i == "undefined") i = 0;
		if(typeof output == "string") output = new LinkedItem(output);

		var temp;

		while(output)
			{
			if(output.contents.length == 2)
				{
				output = unravelSymbol(output);
				}
			else //add to output array a at index i:
				{
				temp = output;
				output = output.next();
				a[i++] = temp.contents.charCodeAt(0);
				temp.unlink();
				}
			}

		return {output:a, index: i};
		}

	//gives number of bis required to represent n number of combinations:
	function bitsRequired(n)
		{
		if(n < 1) return 0;
		var count = 0;
		while(n != 0)
			{
			n = n >> 1;
			++count;
			}
		return count;
		}

	function countAllSymbols()
		{
		if(typeof s_first == "undefined") return false;

		grammar_length = 0;
		rule_count = 0;
		longest_rule = 0;

		var a = {};
		function add(s)
			{
			if(a[s]) ++a[s];
			else a[s] = 1;						
			}

		var current = s_first, c;
		//add all symbols from grammar:
		while(current)
			{
			++grammar_length;
			add(current.contents);
			current = current.next();
			}
		//add all symbols from rules:
		var r, r_length;
		for(var i in rules)
			{
			r_length = 0;
			++rule_count;
			add(i);
			r = rules[i].next();
			while(r)
				{
				++r_length;
				add(r.contents);
				r = r.next();
				}
			if(r_length > longest_rule) longest_rule = r_length;
			}
		//return:
		return a;
		}
	
	function removePointlessRules()
		{
		if(!length) return false;
		//remove any rules where rule_count * rule_length <= 6
		//symbol_saving =~ rule_length+1.5 - (rule_frequency * (rule_length-1))

		var utility = settings.rule_utility.val;

		delete_these = {};
		//digrams rendered pointless so remove:
		digrams = {};
		allow_adding = false; //messes up refs etc so no more adding now.


		//if symbol is a rule, and the rule isnt used enough/long enough:
		//replace symbol with said rule

		function process(symbols)
			{
			//if symbol is a rule, and rule meets deletion criterea, expand and add to delete_these:
			while(symbols)
				{
				var symbol = symbols.contents, delete_me;
				if(symbol.length == 2)
					{
					var rule = rules[symbol];
					if(delete_these[symbol] || (rule.length()-1)*rule.contents.count < utility)
						{
						//expand out rule and mark it for deletion:
						if(delete_these[symbol]) //if symbol has been seen and substituted once..
							{
							//increase count of any rules in symbol:
							var r_temp = rule.next();
							while(r_temp)
								{
								if(r_temp.contents.length == 2) ++rules[r_temp.contents].contents.count;
								r_temp = r_temp.next();
								}
							}
						else delete_these[symbol] = true;
						//copy in rule:
						delete_me = symbols;
						symbols.insertAfter.apply(symbols, rule.next().getContents(0));
						symbols = symbols.next();

						//if symbol to be removed is first or last, update first/last pointer:
						if(s_first == delete_me) s_first = delete_me.next();
						else if(s_last == delete_me) s_last = symbols;

						//remove original symbol:
						delete_me.unlink();
						}
					else symbols = symbols.next();
					}
				else symbols = symbols.next();
				}
			}

		for(var i in rules)
			{
			var rule_contents = rules[i].next();
			process(rule_contents);
			}

		//look through grammar, replacing rules for symbols when necessary too:
		process(s_first);

		//delete unused rules now:
		for(var i in delete_these)
			{
			delete rules[i];
			}
		}

	this.compress = function(w) //pass in ByteStreamWriter object to continue adding to it.
		{
		if(!length) return false;

		if(typeof w == "undefined") 
			if(typeof ByteStreamWriter == "undefined")
				{
				throw Error("Sequitur::compress: ByteStreamWriter object needs to be available.");
				}
			else w = new ByteStreamWriter();

		//###remove pointless rules first###
		removePointlessRules();

		//encode symbols in huffman tree (which also gets highest freq rule, and longest rule):
		var symbol_frequencies = countAllSymbols();
		var huffman = new HuffmanTree(symbol_frequencies);
		var highest_freq = huffman.highestFrequency();
		var number_of_symbols = huffman.symbolCount();
		huffman = huffman.symbolEncodingPairs();
		var se = {}, s;
		for(var i = huffman.length; i--;)
			{
			s = huffman[i];
			se[s[1]] = s[0];
			}
		huffman = undefined; //remove all but se now, so it can be garbage collected.

		//highest_freq = frequency of most commonly occuring rule.
		//longest_rule = longest rule length.
		//rule_count = number of rules.
		//symbol_frequencies = symbol -> frequency pairs.
		//se = symbol -> encoding pairs.

		//encode number of symbols, then bits required for symbol frequency:
		w.add(number_of_symbols);
		var frequency_bits = bitsRequired(highest_freq);
		w.add(frequency_bits, 8); //we only need a few bits for this number.

		//encode huffman tree:
		for(var i in symbol_frequencies)
			{
			if(i.length == 2) //is a rule.
				{
				w.addBits("1"); //1 for rule.
				w.add(symbol_frequencies[i], frequency_bits); //rule frequency.
				}
			else
				{
				w.addBits("0"); //not a rule.
				w.add(i, 8); //add symbol into 8 bits.
				w.add(symbol_frequencies[i], frequency_bits); //add symbol frequency.
				}
			}

		//encode number of rules and bits required for rule length:
		w.add(rule_count);
		var rule_length_bits = bitsRequired(longest_rule);
		w.add(rule_length_bits, 8);

		//encode rules:
		var l, rule;
		for(var i in rules)
			{
			rule = rules[i];
			l = rule.next().getContents(0).length; //get rule length;

			w.addBits(se[i]); //add huffman encoded rule ID.			
			w.add(l, rule_length_bits); //add rule length

			//add rule symbols (huffman encoded):
			rule = rule.next()
			while(rule)
				{
				w.addBits(se[rule.contents]);
				rule = rule.next();
				}
			}

		//encode grammar length:
		w.add(grammar_length);

		//encode grammar:
		var g = s_first;
		while(g)
			{
			w.addBits(se[g.contents]);
			g = g.next();
			}

		//return ByteStreamWriter containing current data written:
		return w
		}


	this.decompress = function(r, output, output_index) //pass in ByteStreamReader. optionally also output and index to start from
		{
		if(!(r instanceof ByteStreamReader)) throw Error("Sequitur::decompress: need to provide ByteStreamReader.");		

		allow_adding = false; //new symbols shouldnt be added..no digram index.

		//read number of symbols and bits used for symbol freqs:
		var number_of_symbols = r.readAsInt();
		var symbol_freq_bits = r.readAsInt(8);

		//read in symbols and frequencies for huffman encoding (creating new rule symbols as required):
		var symbol_frequencies = {}, r_freq, r_char;
		while(number_of_symbols--)
			{
			if(r.readBits(1)[0] == "1") //next bits are a rule (regenerates rule symbols on the fly).
				{
				symbol_frequencies[generateRuleSymbol()] = r.readAsInt(symbol_freq_bits);
				}
			else //next bits are terminal symbol.
				{
				r_char = r.readAsChar(8);
				r_freq = r.readAsInt(symbol_freq_bits);
				symbol_frequencies[r_char] = r_freq;
				}
			}

		//generate huffman tree given symbol frequencies:
		var huffman = new HuffmanTree(symbol_frequencies);

		//read in rule count and rule length bits:
		var rule_count = r.readAsInt();
		var rule_length_bits = r.readAsInt(8);

		//function to read in huffman bits and output symbol:
		function readHuffmanSymbol()
			{
			var o;
				do o = huffman.navigate(r.readBits(1)[0]);
				while(o === false);
			return o;
			}

		//read in rules, decoding all symbols through huffman tree:
		var rl, r_symbol, r_contents, r_count;
		while(rule_count--)
			{
			r_symbol = readHuffmanSymbol(); //get rule symbol.
			rl = r.readAsInt(rule_length_bits); //get rule length.
			r_count = symbol_frequencies[r_symbol] - 1; //get rule count based on symbol frequencies.
			r_contents = [];
			while(rl--)
				{
				r_contents.push(readHuffmanSymbol());
				}
			addRule(r_symbol, r_contents, r_count);
			}

		//read in grammar, decoding all symbols through huffman tree:
		var grammar_length = r.readAsInt();
	
		//create array if needbe to output stuff too: better to pass in one though.
		if(typeof output == "undefined" || typeof output.length == "undefined")
			{
			output = [];
			}
		if(typeof output_index == "undefined") output_index = 0;

		//read symbols, unravelling any rules:
		for(var i = 0; i < grammar_length; i++)
			{
			output_index = unravel(readHuffmanSymbol(), output, output_index).index;
			}
		
		return {output: output, index: output_index};
		}


	function clear()
		{
		if(s_first instanceof LinkedItem) s_first.unlinkAll();
		s_first = undefined;
		addSymbol = addSymbolFirstRun;
		allow_adding = true;
		digrams = {};
		for(var i in rules)
			{
			rules[i].unlinkAll();
			}
		rules = {};
		longest_rule = 0;
		length = 0;
		rule_count = 0;
		grammar_length = 0;
		RuleNumber.erase();
		}		

	//#### Public Functions: ####

	//clears everything so that we can use again (do this if you want to delete Sequiter too):
	this.clear = clear;

	this.add = add;

	this.length = function(){return length;};

	//returns original string to array (each entry representing 8 bits):
	this.unravel = function(array, offset)
		{
		return unravel(s_first, array, offset);
		}

	//counts rules:
	this.ruleCount = function() 
		{
		var c = 0;
		for(var i in rules)
			{
			++c;
			}
		return c;
		}

	this.test = function()
		{
		console.log(rules);
		console.log(digrams);
		console.log("grammar:");
		var grammar = "";

		if(s_first instanceof LinkedItem)
			{
			s_first.getContents(0).every(function(s)
				{
				if(s.length == 2) grammar += "[" + ~stringToNumber(s) + "] - ";
				else grammar += s + " - ";
				return true;
				});
			console.log(grammar.slice(0,-2));
			}
		console.log("rules:");
		for(var i in rules)
			{
			var r = rules[i];
			var str = ~stringToNumber(r.contents.symbol) + ": ";
			r.next().getContents(0).every(function(val) 
				{
				if(val.length == 2) str += "[" + ~stringToNumber(val) + "] - ";
				else str += val + " - ";
				return true;
				});
			console.log(str.slice(0,-2));
			}
		console.log("digram index:");
		console.log(outputDigrams());
		}
	}
