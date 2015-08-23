importScripts('bitstream.js', 'linkeditem.js', 'huffmantree.js', 'sequitur.js', 'bwt-and-mtf.js');

var s;
var compressed_output = [];
var b = new ByteStreamWriter(compressed_output);
var blocks = 0;
var time = 0; //count the time taken to add and compress.

//necessary so decompressor knows which algorithm to use from ID:
var compression_algorithms = ["Sequitur", "BWTCompressor"];

//these functions set rule utility and algorithm via the set function:
function checkRuleUtility(n)
	{
	return s.set("rule_utility", n);
	}
function checkAlgorithm(n)
	{
	clear();
	s = eval("new " + n + "()");
	s.set("rule_utility", settings.rule_utility.val); //make sure rule utility is set upon algorithm change.
	return n;
	}

var settings = {
	rule_utility: {val: undefined, check:checkRuleUtility},
	algorithm: {val: undefined, check: checkAlgorithm},
	algorithm_id: {val: undefined}
	};

function set(s, val)
	{
	var setting = settings[s];
	if(setting) 
		{
		if(typeof val !== "undefined")
			{
			var new_val = (typeof setting.check == "function")? setting.check(val) : val;
			if(new_val !== null) setting.val = new_val;
			}
		return setting.val;
		}
	return null;
	}

function log(event, details)
	{
	if(typeof event == "undefined") event = "unknown";
	self.postMessage({response: "log", data: {event: event, details: details}});
	}

function compressFileDetails(details)
	{
	var writer = new ByteStreamWriter();

	var count = 0;
	
	writer.add(settings.algorithm_id.val, 8); //unique identifier for compression algorithm used.

	for(var i in details)
		{
		//remove first letter ("f") from file as it was added deliberately.
		i = i.slice(2);

		//keep count of number of filenames:
		++count;

		//add length of file to 8 bits:
		var l = i.length;
		if(l > 255) l = 255;
		writer.add(l, 8);

		//write filename, 8 bits per char:
		for(var j = 0; j < l; j++) writer.add(i[j], 8);

		//write file length in bytes:
		writer.add(details["f:"+i], 32);
		}

	writer.add(blocks, 32); //write number of blocks at end of file list.
	var output = writer.flushBuffer();

	//file count to 16 bits (so max 65535 files):
	if(count > 65535) count = 65535;
	output.unshift(String.fromCharCode(count));

	//log:
	log("file_details", {files: details, number: count, blocks: blocks, size: compressed_output.length*2});

	return output;
	}

function decompressFileDetails(reader)
	{
	var output = {};
	//var bits = 16;
	var temp_size = 0;
	var number_of_files = reader.readAsInt(16);
	
	//set up algorithm used:
	var algorithm_id = reader.readAsInt(8);

	var decompressed_size = 0;

	for(var i = 0; i < number_of_files; i++)
		{
		//bits += 8;
		var length = reader.readAsInt(8);
		var name = "f:"; //add letter before name to ensure order remains correct (numbers places before normally)
		while(length--)
			{
			//bits += 8;
			name += reader.readAsChar(8);
			}

		//bits += 32;
		temp_size = reader.readAsInt(32);
		output[name] = temp_size; //get filesize
		decompressed_size += temp_size;
		}

	var decompressed_blocks = reader.readAsInt(); //get number of blocks.
	reader.flushBuffer() //incase number of bits was not divisible by 16 (and so was padded out with 8 0's).

	log("file_details", {files: output, number: number_of_files, blocks: blocks, size: decompressed_size});
	return {files:output, size: decompressed_size, blocks: decompressed_blocks, algorithm_id: algorithm_id};
	}

function clear()
	{
	if(typeof s == "object") s.clear();
	blocks = 0;
	time = 0;
	compressed_output = [];
	b = new ByteStreamWriter(compressed_output);
	}

var options = {

	add: function(data) //data takes the form of an ArrayBuffer.
		{
		var start_time = new Date(); //time it.

		var view = new Uint8Array(data);

		for(var i = 0; i < view.length; i++)
			{
			s.add(view[i]);
			}

		var end_time = new Date();
		time += end_time - start_time;
		self.postMessage({response:"added"});
		},

	//set or get a setting value:
	set: function(params)
		{
		var result = set(params.setting, params.value);
		self.postMessage({response:"setting", data: {setting:params.setting, value:result}});
		},

	compressBlock: function() //compresses current block to stream.
		{
		var start_time = new Date();

		if(s.length())
			{
			log("general", "Compressing block " +(blocks+1)+ ".");
			s.compress(b);		
			log("general", "Compressed block " +(blocks+1)+ ".");	
			++blocks; //assuming there is data to compress, increment count of blocks.
			s.clear();
			}
		else throw Error("compression_core::compressBlock: nothing to compress.");

		var end_time = new Date();
		time += end_time - start_time;
		},

	finalizeCompression: function(details) //gives back compressed data given file details.
		{
		var start_time = new Date();
		log("general", "Finalizing compression of files.");

		//compress anything left to array.
		if(s.length())
			{
			log("general", "Compressing block " +(blocks+1)+ ".");
			s.compress(b);
			log("general", "Compressed block " +(blocks+1)+ ".");	
			++blocks;
			b.flushBuffer();
			s.clear();
			}

		//put file details into array (ready to prepend to arraybuffer):
		var d = compressFileDetails(details);

		//turn into arraybuffer maybe, then return.
		var a = new ArrayBuffer(d.length * 2 + compressed_output.length*2);
		var view = new Uint16Array(a);

		var d_length = d.length, compressed_output_length = compressed_output.length;

		log("general", "Writing file details to output.");
		var i = 0;
		for(; i < d_length; i++)
			{
			view[i] = d[i].charCodeAt(0);
			}

		log("general", "Writing compressed blocks to output.");
		for(var j = 0; j < compressed_output_length; i++, j++)
			{
			view[i] = compressed_output[j].charCodeAt(0);
			}


		var end_time = new Date();
		time += end_time - start_time;

		//return, transferring if possible:
		log("general", "Output written.");
		log("general", "Total time to compress and output: "+(time/1000).toFixed(2)+" seconds.");

		//clear worker data now compression complete (ready to be used fresh):
		clear();
		self.postMessage({response:"compressed", data:a}, [a]);
		},

	decompress: function(file) //decompresses data, shoving each file into an arraybuffer and then returning them all.
		{
		//time it:
		var start_time = new Date();

		//decompression kept seperate from compression, and thus has no impact on it:
		var decompressor;

		try{
			var reader = new ByteStreamReader(file); //file is an arraybuffer, but can also be a string or array or chars.

			var file_details = decompressFileDetails(reader);

			//set algorithm to use from file details.
			var algorithm_name = compression_algorithms[file_details.algorithm_id];
			decompressor = eval("new " + algorithm_name + "()"); 


			log("general", "Decompressing using algorithm: " + algorithm_name);

			var a = new Uint8Array(file_details.size); //set decompressed size from file details.
			var i = 0;

			var l = file_details.blocks; //total number of blocks from file details

			log("progress", {current: 0, total: l});
			for(var current_block = 0; current_block < l; current_block++)
				{
				log("general", "Decompressing block " + (current_block+1) + ".");
				i = decompressor.decompress(reader, a, i).index; //decompress compressed block.
				log("general", "Decompressed block " + (current_block+1) + ".");
				log("progress", {current: current_block+1, total: l});
				}
			}
		catch(e)
			{
			self.postMessage({response:"error", data: {type:"decompression", value:false}});
			return;
			}

		var end_time = new Date();

		//post this back:
		log("general", "Decompression complete in "+((end_time-start_time)/1000).toFixed(2) +" seconds.");
		self.postMessage({response:"decompressed", data:{details: file_details.files, output: a.buffer}}, [a.buffer]);
		},

	clear: function(d)
		{
		clear()
		self.postMessage({response: "cleared"});
		}
	};

self.onmessage = function(event)
	{
	var o = event.data;
	if(options[o.cmd]) options[o.cmd](o.params);
	else throw Error("function " + o.cmd + " does not exist, so worker is doing nothing.");
	}

self.onerror = function(event)
	{
	throw event.data;
	}
