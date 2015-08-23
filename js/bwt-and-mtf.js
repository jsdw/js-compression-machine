//
// Burrow-Wheelers Transform Implementation:
// can take in practically anything that can be iterated over, and transforms/reverses BWT:
// Where letters tend t ofollow other letters, this will lead to a lot of symbol repetition.
//
// 
function BWT()
	{
	if(!(this instanceof BWT)) return new BWT();
	}

BWT.prototype.transform = function(input) //works with array, string (converted to array) or any typed array, outputting the same.
	{
	if(typeof input == "string") input = input.split("");

	var indexes = [], l = input.length;
	for(var i = 0; i < l; i++) indexes.push(i);

	indexes.sort(function(a, b) //sorts based on alphabetical order of entire string from current pos.
		{
		var o_a = a; //remember original position.

		while(input[a] == input[b])
			{
			if(++a == l) a = 0;
			if(++b == l) b = 0;
			if(a == o_a) return 0;
			}

		if(input[a]+"" < input[b]+"") return -1; //compare as strings.
		else return 1;
		});

	var output = new input.constructor(input.length); //make whatever was input, passing in length as parameter.
	
	var pos;
	l = input.length;
	for(var i = 0; i < l; i++)
		{
		var idx = indexes[i]-1;
		if(idx === -1) {idx = l-1; pos = i;}
		output[i] = input[idx];
		}		

	return {output: output, index: pos};
	};

BWT.prototype.reverse = function(input_object) //must take same form as object returned above.
	{
	if(typeof input_object.output == "undefined" || typeof input_object.index == "undefined") return false;		

	var input = input_object.output, index = input_object.index;
	if(typeof input == "string") { input = input.split(""); }
	
	//iterate over input, keeping count of unique symbols in object, and constructing array 
	//with number of matching symbols before each symbol seen.
	var l = input.length, frequencies = {}, before = [];
	if(!l) return false;
	for(var i = 0; i < l; i++)
		{
		freq = frequencies[input[i]] || 0;
		if(!freq) frequencies[input[i]] = 1;
		else ++frequencies[input[i]];
		before.push(freq);
		}

	//now we have list of unique symbols.make new obj, and for each symbol, count number of symbols
	//which exist and are alphabetically less than it.
	var sorted_symbols = [];
	for(var i in frequencies)
		{
		sorted_symbols.push(i); //sorts in terms of strings, as symbols obtained here are so.
		}

	sorted_symbols.sort(function(a,b)
		{
		if(a < b) return -1;
		else if(a == b) return 0;
		else return 1;
		});
	
	var sorted_length = sorted_symbols.length, number_symbols_less = {}, running_count = 0;
	for(var i = 0; i < sorted_length; i++)
		{
		var s = sorted_symbols[i];
		number_symbols_less[s] = running_count;
		running_count += frequencies[s];
		}

	//make object same as input array type, and fill it in from back using info created above.
	var output = new input.constructor(l);

	//work from back filling in new output:
	output[--l] = input[index], v = index;
	while(l--)
		{
		v = before[v] + number_symbols_less[input[v]];
		output[l] = input[v];
		}

	//return new array thing.
	return output;
	};

//
// Move to front coding:
// converts symbols to values, wherein repetition ends up leading to lots of 0's.
//

function MTF()
	{
	if(!(this instanceof MTF)) return new MTF();

	if(typeof LinkedItem != "function") throw Error("ERROR: MTF: Need LinkedItem class to be available.");
	}

MTF.prototype.transform = function(input, alphabet) //alphabet is ORDERED array of symbols to work with, optional (is created if not given).
	{
	if(typeof input == "string") input = input.split("");

	var l = input.length;
	if(!l) return false;

	var a = new LinkedItem();

	if(typeof alphabet == "undefined" || !alphabet.length) //make alphabet if need be
		{
		(function()
			{
			var symbols = {};
			alphabet = [];
			for(var i = 0; i < l; i++) symbols[input[i]] = true;
			for(var i in symbols) alphabet.push(i);
			alphabet.sort();
			})();
		}

	//turn alphabet into linkeditem:
	var remove_me = a;
	a.insertAfter.apply(a, alphabet);
	a = a.next();
	remove_me.unlink();

	//make output:
	var output = new input.constructor(l);

	//for each input, find position in alphabet, put in output, and move to front.
	var pos, index;
	for(var i = 0; i < l; i++)
		{
		pos = a;
		index = 0;
		var current = input[i];
		while(pos)
			{
			if(pos.contents == current) 
				{
				output[i] = index;
				if(pos != a) a = a.insertListBefore(pos, 1);
				break;
				}
			++index;
			pos = pos.next();
			}
		}
	//prepare linkeditem for removal before finishing:
	a.unlinkAll();
	return {output: output, alphabet: alphabet};
	};

MTF.prototype.reverse = function(input_object) //takes in object returned from above.
	{
	var input = input_object.output, l = input.length;
	var alphabet = input_object.alphabet;

	//turn alphabet into LinkedItem:
	var a = new LinkedItem(), remove_me = a;
	a.insertAfter.apply(a, alphabet);
	a = a.next();		
	remove_me.unlink();

	//make output:
	var output = new input.constructor(l);

	//turn input into output:
	for(var i = 0; i < l; i++)
		{
		var pos = input[i];
		var b = a.next(pos);
		output[i] = b.contents;
		if(a != b) a = a.insertListBefore(b, 1);
		}

	a.unlinkAll();
	return output;
	};


//
// Compression algorithm which utilises the above, plus huffman encoding.
//


function BWTCompressor()
	{
	if(!(this instanceof BWTCompressor)) return new BWTCompressor();
	if(typeof HuffmanTree == "undefined") throw Error("ERROR: BWTCompressor: HuffmanTree needs to be available.");

	var bwt = new BWT();
	var mtf = new MTF();

	var buffer = [];
	var unique_symbols = {}; //useful when we MTF things, might as well do it as we go.

	function bitsRequired(n) //number of bits required to represent number up to n
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


	//no options to set, so return false regardless of what's passed in: (exists to standardize with Sequitur).
	this.set = function()
		{
		return false;
		};

	this.add = function(symbol)
		{
		if(typeof symbol == "string")
			{
			var l = symbol.length;
			for(var i = 0; i < l; i++) this.add(symbol.charCodeAt(i));
			return false;
			}
		else if(symbol instanceof Array)
			{
			var l = symbol.length;
			for(var i = 0; i < l; i++) this.add(symbol[i]);
			return false;
			}

		if(symbol < 0 || symbol > 255) 
			throw Error("ERROR: BWTCompressor::Add: value must be an 8 bit number between 0 and 255, but is " + symbol);

		buffer.push(symbol);
		if(!unique_symbols[symbol]) unique_symbols[symbol] = true;
		return true;
		};

	this.length = function() {return buffer.length;};

	this.compress = function(w) //where w is a ByteStreamWriter if we want to append compressed data to some existing.
		{
		if(!buffer.length) return false;

		if(typeof w == "undefined") 
			if(typeof ByteStreamWriter == "undefined")
				{
				throw Error("BWTCompressor::compress: ByteStreamWriter object needs to be available.");
				}
			else w = new ByteStreamWriter();

		//first, get result of applying BWT to buffer.
		var o = bwt.transform(buffer);
		var bwt_index = o.index;

		//next, get result of applying MTF to buffer (give it a sorted alphabet to save a little time):
		var alphabet = [];

		for(var i in unique_symbols) alphabet.push(parseInt(i));
		alphabet.sort(function(a,b){return a-b;});
		o = mtf.transform(o.output, alphabet).output;

		//generate huffman frequencies from MTF encoded output now:
		var o_length = o.length, huffman_frequencies = {}, highest_frequency = 1; 
		for(var i = 0; i < o_length; i++)
			{
			var symbol = o[i];
			if(!huffman_frequencies[symbol]) huffman_frequencies[symbol] = 1;
			else if(++huffman_frequencies[symbol] > highest_frequency) highest_frequency++;
			}

		//next, get huffman symbols to represent numbers from o:
		var huffman_pairs = new HuffmanTree(huffman_frequencies).symbolEncodingPairs();
		var h_pairs_length = huffman_pairs.length;
		var symbol_encodings = {}, pair;
		for(var i = 0; i < h_pairs_length; i++)
			{
			pair = huffman_pairs[i];
			symbol_encodings[pair[1]] = pair[0];
			}

		//add MTF alphabet length, then each alphabet letter:
		var alphabet_length = alphabet.length, symbol;
		w.add(alphabet_length, 9);
		for(var i = 0; i < alphabet_length; i++)
			{
			symbol = parseInt(alphabet[i]);
			w.add(symbol, 8);
			}

		//add highest symbol freq in 32 bits, for huffman alphabet:
		var freq_bits = bitsRequired(highest_frequency);
		w.add(freq_bits, 6);
		w.add(h_pairs_length, 9);

		//add each huffman alphabet letter followed by frequency (length is same as MTF alphabet):
		for(var i in huffman_frequencies)
			{
			w.add(parseInt(i), 8);
			w.add(huffman_frequencies[i], freq_bits);
			}

		//add BWT index:
		w.add(bwt_index, 32);

		//add length of grammar:
		w.add(o_length, 32);


		//finally, add huffman encoded symbols:
		for(var i = 0; i < o_length; i++)
			{
			w.addBits(symbol_encodings[o[i]]);
			}

		return w;
		};

	this.decompress = function(r, output, output_index)
		{
		if(!(r instanceof ByteStreamReader)) throw Error("BWTCompressor::decompress: need to provide ByteStreamReader.");
		if(typeof output == "undefined" || typeof output.length == "undefined") output = [];
		if(typeof output_index == "undefined") output_index = 0;

		//read alphabet length:
		var alphabet_length = r.readAsInt(9);

		//read MTF alphabet:
		var alphabet = [];
		for(var i = 0; i < alphabet_length; i++)
			{
			alphabet.push(r.readAsInt(8));
			}

		//read highest freq symbol for huffman:
		var freq_bits = r.readAsInt(6);

		//get length of huffman symbols:
		var huffman_length = r.readAsInt(9);

		//read in huffman symbols:
		var huffman_frequencies = {}, symbol;
		for(var i = 0; i < huffman_length; i++)
			{
			symbol = r.readAsInt(8);
			huffman_frequencies[symbol] = r.readAsInt(freq_bits);
			}

		//read BWT index and number of symbols:
		var bwt_index = r.readAsInt(32);

		var grammar_length = r.readAsInt(32);

		//generate huffman tree to read grammar:
		var huffman = new HuffmanTree(huffman_frequencies);

		//function to read huffman symbol:
		function readHuffmanSymbol()
			{
			var o;
				do o = huffman.navigate(r.readBits(1)[0]);
				while(o === false);
			return o;
			}
		
		//read grammar to output:
		var temp_output = new Uint8Array(grammar_length);		
		for(var i = 0; i < grammar_length; i++)
			{
			temp_output[i] = readHuffmanSymbol();
			}

		//convert output back from MTF encoding:
		temp_output = mtf.reverse({output: temp_output, alphabet: alphabet});

		//convert back from bwt:
		temp_output = bwt.reverse({output: temp_output, index: bwt_index});

		//add to actual output:
		for(var i = 0; i < grammar_length; i++)
			{
			output[output_index++] = temp_output[i];
			}
		
		//return in standardised format:
		return {output: output, index: output_index};
		};

	//standard function, necessary:
	this.clear = function()
		{
		buffer = [];
		unique_symbols = {};
		};

	}







