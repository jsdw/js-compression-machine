//
// Compression surface. Communicates with compression_core worker to compress/decompress files.
// Copyright James Wilson 2012.

var compressor = new function()
	{
	var file_details = {}; //details of all files added.
	var files_to_process = [];
	var compression_algorithms = ["Sequitur", "BWTCompressor"]; //compression algorithm constructors.
	var w; //worker.

	var chunks_to_process = 0; //number of chunks of input_block_size left to process
	var processed_bytes = 0; //number of bytes processed so far in block.
	var total_bytes = 0; //total number of bytes to add so far.
	var total_processed_bytes = 0; //total number of bytes processed so far.
	var blocks = 0; //number of compressed blocks so far.
	var current_input_block_size;

	//setting check functions:
	function isNonZeroUInt(n)
		{ var a = parseInt(n); return (isNaN(a) || a < 1)? null : a;}
	function isUInt(n)
		{ var a = parseInt(n); return isNaN(a)? null : a; }
	function isFunc(n) 
		{return (typeof n == "function")? n : null;}
	function checkRuleUtility(n)
		{ //sets rule utility in worker if its a value float, as well as performing check:
		var a = parseFloat(n);
		a = isNaN(a)? null : a;
		if(a !== null) workerSet("rule_utility", a);
		return a;
		}
	function checkAlgorithm(n)
		{
		var i = compression_algorithms.indexOf(n);
		if(i >= 0)
			{
			workerSet("algorithm", n);
			workerSet("algorithm_id", i);
			return n;
			}
		return null;
		}
	function checkAlgorithmID(n)
		{
		return (checkAlgorithm(compression_algorithms[n]) === null)? null : n;
		}

	//settings:
	var settings = {
		input_block_size: {val: 20000, check: isNonZeroUInt},
		compressed_block_size: {val: 2000000, check: isNonZeroUInt},
		rule_utility: {val: 20, check: checkRuleUtility},
		finished_compression_callback: {val: function(){}, check: isFunc},
		finished_decompression_callback: {val: function(){}, check: isFunc},
		cleared_callback: {val: function(){}, check: isFunc},
		setting_callback: {val: function(){}, check: isFunc},
		log_callback: {val: function(){}, check: isFunc},
		algorithm: {val: "Sequitur", check: checkAlgorithm},
		algorithm_id: {val: undefined, check: checkAlgorithmID},
		error_callback: {val: function(){}, check: isFunc}
		}	

	//set (or get) a setting value:
	function set(s, val)
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

	//initialize the worker (or reinitialize):
	function initWorker()
		{
		if(w instanceof Worker) w.terminate();
		w = new Worker("js/compression_core.js");
		w.onmessage = receivedFromWorker;

		set("algorithm", set("algorithm"));
		set("rule_utility", set("rule_utility"));	
		}

	//sets a setting on the worker thread:
	function workerSet(s, val)
		{
		w.postMessage({cmd: "set", params: {setting:s, value:val}});
		}

	//clears local values, resetting them to original state:
	function clearLocal()
		{
		chunks_to_process = 0;
		processed_bytes = 0;
		total_bytes = 0;
		total_processed_bytes = 0;
		blocks = 0;
		file_details = {};
		files_to_process = [];
		}

	function log(name, details)
		{
		settings.log_callback.val(name, details);
		}

	function receivedFromWorker(e) //respond appropriately when the worker posts anything back:
		{
		var stuff = e.data;
		switch(stuff.response)
			{
			case "added": //if weve just added a chunk of a file, add other chunks or finish processing file:
				log("progress", {current: total_processed_bytes, total: total_bytes});
				if(!chunks_to_process) break;
				if(!--chunks_to_process) doneProcessing();
				else nextChunk();
				break;
			case "log":
				settings.log_callback.val(stuff.data.event, stuff.data.details);
				break;
			case "compressed": //if we've compressed files to arraybuffer:
				settings.finished_compression_callback.val(stuff.data);
				break;
			case "decompressed": //if we're returning decompressed files:
				settings.finished_decompression_callback.val(stuff.data);
				break;
			case "cleared":
				log("general", "Cancelled actions.");
				settings.cleared_callback.val();
				break;
			case "setting":
				settings.setting_callback.val(stuff.data.setting, stuff.data.result);
				break;
			case "error":
				settings.error_callback.val(stuff.data.type, stuff.data.value);
				break;
			}
		}

	function doneProcessing() //called when web worker has finished compressing a file, to begin compressing the next one.
		{
		log("general", "Finished processing \"" + files_to_process[0].name + "\".");
		files_to_process.shift();
		process();
		}

	function nextChunk() //add next chunk of input_block_size to compressed stream
		{
		var file = files_to_process[0];
		var input_block_size = current_input_block_size;
		var total_chunks = Math.ceil(file.size / input_block_size);

		//based on chunks left, work out what chunk of the file to process next:
		var start_pos = (total_chunks - chunks_to_process) * input_block_size;
		var end_pos = start_pos + input_block_size;

		//if end_pos overruns end of file, set it to end of file:
		if(end_pos > file.size) end_pos = file.size;

		//compress chunk if bytes processed exceeds chunk size:
		if(processed_bytes + end_pos - start_pos > settings.compressed_block_size.val)
			{
			//compress block and prepare for next one (setting current rule utility before doing so:
			w.postMessage({"cmd": "compressBlock"});
			++blocks;
			processed_bytes = 0;
			}

		//keep count of number of bytes processed so far (total and per block):
		processed_bytes += end_pos - start_pos;
		total_processed_bytes += end_pos - start_pos;

		var r = new FileReader();

		r.onloadend = function(e)
			{
			if(e.target.readyState == FileReader.DONE)
				{
				w.postMessage({"cmd": "add", "params": e.target.result}, [e.target.result]);
				}
			else throw Error("Error: Compressor: Reading file slice failed.");
			}

		r.readAsArrayBuffer(file.slice(start_pos,end_pos));
		}

	function process() // called when there are still files left to process
		{
		//if there are files to process..
		if(files_to_process.length)
			{
			current_input_block_size = settings.input_block_size.val;
			var file = files_to_process[0];
			log("general", "Processing \"" + file.name + "\".");
			log("progress", {current: total_processed_bytes, total: total_bytes});
			chunks_to_process = Math.ceil(file.size / current_input_block_size);
			nextChunk();
			}
		}

	this.add = function(files) //adds files to array and processes them if array not already being processed.
		{
		if(!(files instanceof Array || files instanceof FileList)) files = [files]; //if it's a single file, put in list.

		var do_process = false;
		if(!files_to_process.length) do_process = true;

		var l = files.length, c = 0;
		for(var i = 0; i < l; i++)
			{
			var file = files[i];
			var file_name = "f:"+file.name;
			if(!file_details[file_name]) 
				{
				file_details[file_name] = file.size;
				total_bytes += file.size;
				files_to_process.push(file);
				log("general", "File \"" + file.name + "\" added for compression.");
				++c;
				}
			else log("general", "File \"" + file.name + "\" already added, so ignoring.");			
			}

		if(do_process && files_to_process.length) setTimeout(process, 0); //schedule process op.
		return c; //return number of files to be processed.
		};

	var finalize_compression_interval;
	this.finalizeCompression = function(callback) //tells worker we've added everything and want the output now.
		{
		set("finished_compression_callback", callback);
		log("general", "Writing compressed data to output once all pending files added.");

		function checkAndFinalize()
			{
			if(!files_to_process.length)
				{
				clearInterval(finalize_compression_interval);
				w.postMessage({cmd:"finalizeCompression", params: file_details});
				clearLocal();
				}
			}

		clearInterval(finalize_compression_interval);
		finalize_compression_interval = setInterval(checkAndFinalize, 250);
		};

	this.decompress = function(files, callback) //tells worker to decompress file/blob object and then run callback.
		{
		if(!(files instanceof Array || files instanceof FileList)) files = [files]; //if it's a single file, put in list.
		set("finished_decompression_callback", callback);
		clearLocal(); //clear any compression lark that was going on. (can do both at once but lets not worry about that).

		var l = files.length;
		for(var i = 0; i < l; i++) 
			{
			var r = new FileReader();
			r.onload = function(e)
				{
				w.postMessage({cmd:"decompress", params: e.target.result}, [e.target.result]);
				};
			r.readAsArrayBuffer(files[i]);
			}

		return l;
		};

	this.set = set;

	function cancel() //cancels any ongoing operations ready for new task.
		{
		log("general", "Cancelling actions.");
		clearLocal(); //clears local settings:
		clearInterval(finalize_compression_interval); //if we are planning on finalizing, cancel.
		initWorker();
		}

	this.cancel = cancel;

	//#### Finally, initialize the worker: ####
	initWorker();

	}
