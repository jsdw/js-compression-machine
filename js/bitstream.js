//
// Create data from random lengths of bit values (taken as binary, char or int)
// and then read back this data.
// Useful in protocols for writing and reading custom data in from files containing UTF-8 characters.
//

//if array is passed in, the writer will append to it rather than start fresh:
function ByteStreamWriter(bytes)
	{
	if(!(this instanceof ByteStreamWriter)) return new ByteStreamWriter();

	if(typeof bytes == "undefined") bytes = [];
	var temp_bits = [];

	function flush()
		{
		var c;
		while(temp_bits.length >= 16)
			{
			c = temp_bits.splice(0,16);
			bytes.push(String.fromCharCode(parseInt(c.join(""), 2)));
			}
		}

	function addBits(bits)
		{
		if(typeof bits != "string" && !(bits instanceof Array)) 
			throw Error("ByteStreamWriter::addbits: need to provide string or array.");

		//make sure we only add valid bits:
		var b_l = bits.length, bit;
		for(var i = 0; i < b_l; i++)
			{
			bit = bits[i]
			if(bit != 0 && bit != 1) throw Error("ByteStreamWriter::addBits: bit is not 0 or 1.");
			temp_bits.push(bit);
			}

		flush();
		}

	this.addBits = addBits;
	this.add = function(item, bits)
		{
		if(typeof item == "string")
			{
			if(typeof bits == "undefined") bits = 16;
			item = item.charCodeAt(0).toString(2).split("");
			}
		else if(typeof item == "number")
			{
			if(typeof bits == "undefined") bits = 32;
			item = item.toString(2).split("");
			}
		else throw Error("ByteStreamWriter::add: must add either char or number");

		while(item.length < bits) item.unshift("0");
		if(bits < item.length) item = item.slice(item.length - bits);

		temp_bits = temp_bits.concat(item);
		flush();
		}

	this.getBuffer = function()
		{
		return temp_bits;
		}

	this.setBuffer = function(b)
		{
		temp_bits = b;
		}

	this.flushBuffer = function()
		{
		if(temp_bits.length)
			{
			var add_l = 16 - (temp_bits.length % 16);
			while(add_l--) temp_bits.push("0");
			flush();
			}
		return bytes;
		}

	this.size = function()
		{
		return bytes.length*16 + temp_bits.length;
		}

	}

//can read from an arraybuffer, but will not read proper values if anything other than Uint16 used to create it.
function ByteStreamReader(bytes)
	{
	if(!(this instanceof ByteStreamReader)) return new ByteStreamReader(bytes);

	var position = 0;
	var buffer = [];

	if(bytes instanceof ArrayBuffer)
		{
		bytes = new Uint16Array(bytes);
		}

	var getNextCharCode;

	if(typeof bytes == "string") getNextCharCode = function()
			{ 
			return bytes.charCodeAt(position++).toString(2); 
			};
	else if(bytes instanceof Uint16Array) getNextCharCode = function() //for arraybuffer.
			{
			return bytes[position++].toString(2);
			};
	else if(bytes instanceof Array) getNextCharCode = function()
			{ 
			return bytes[position++].charCodeAt(0).toString(2); 
			};
	else throw Error("ByteStreamReader: " + bytes.constructor.name + " is not a valid thing to read from");

	function addCharacterToBuffer()
		{
		if(position == bytes.length) throw Error("ByteStreamReader::addCharacterToBuffer: no more characters to add");
		var temp = getNextCharCode();
		var add_l = 16 - temp.length;
		while(add_l--) buffer.push("0");
		var tl = temp.length;
		for(var i = 0; i < tl; i++) buffer.push(temp[i]);
		}

	function readBit()
		{
		if(!buffer.length) addCharacterToBuffer();
		return buffer.shift();
		}

	this.restart = function()
		{
		position = 0;
		buffer = [];
		}

	this.readAsChar = function(bits)
		{
		if(typeof bits == "undefined") bits = 16;
		while(buffer.length < bits) addCharacterToBuffer();
		var c = buffer.splice(0,bits).join("");
		return String.fromCharCode(parseInt(c, 2));
		}

	this.readAsInt = function(bits)
		{
		if(typeof bits == "undefined") bits = 32;
		while(buffer.length < bits) addCharacterToBuffer();
		var c = buffer.splice(0,bits).join("");
		return parseInt(c, 2);		
		}

	this.readBits = function(n)
		{
		if(typeof n == "undefined" || n < 1) n = 1;
		var output = [];
		while(n--) output.push(readBit());
		return output;
		}

	this.flushBuffer = function()
		{
		//flushes any bits currently in buffer (so next read will be from next char).
		buffer = [];
		}
	}
