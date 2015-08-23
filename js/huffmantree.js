//
// Huffman Tree Algorithm
// Useful for compressing un-random data (hell, or random data where limited number of symbols used).
//

function HuffmanTree(input) //input can be string or array of values, or object with value:freq pairs.
	{
	if(!(this instanceof HuffmanTree)) return new HuffmanTree(input);

	//statistic variables:
	var highest_frequency;
	var unique_symbol_count;

	var tree = (function()
		{
		//find frequency that each item in array/string occurs (if not provided in object):
		var frequencies;
		if(typeof input != "object" || input instanceof Array)
			{
			frequencies = (function()
				{
				var o = {};
				for(var i = input.length; i--;)
					{
					var one = input[i];
					if(o[one]) ++o[one];
					else o[one] = 1;
					}
				return o;
				})();
			}
		else frequencies = input;

		//remove input string/array reference to free up some space:
		input = undefined;

		//turn this into ordered array with lowest frequencies first:
		frequencies = (function()
			{
			var a = [];
			for(var i in frequencies)
				{
				a.push([i,frequencies[i]]);
				}
			a.sort(function(a,b){return a[1] - b[1];})
			return a;
			})();

		if(!frequencies.length) throw Error("HuffmanTree:: Need to provide at least 1 unique symbol to generate tree.");
		else if(frequencies.length == 1)
			return [frequencies[0][0]];

		highest_frequency = frequencies[frequencies.length-1][1];
		unique_symbol_count = frequencies.length;

		//create a simple tree from this array:
		return (function()
			{
			function best()
				{
				var b;
				var f = frequencies.length? frequencies[0][1] : Infinity;
				var n = nodes.length? nodes[0][1] : Infinity;
				if(f < n)
					{
					b = frequencies.shift();
					}
				else b = nodes.shift();
				return b;
				}

			var nodes = []; //second queue.

			var first, second, combined_freq;
			while(frequencies.length + nodes.length > 1)
				{
				first = best();
				second = best();

				combined_freq = first[1] + second[1];
				nodes.push([[first[0], second[0]], combined_freq]);
				}

			return nodes[0][0];
			})();
		})();

	//navigate ref:
	var current_navigation = tree;

	//traverses the tree, returning all symbol/encoding pairs:
	function traverse(state, results) //state is encoding/ref pairs.
		{
		if(!state.length) throw Error("traverse::no length");

		var current = state[state.length-1], add0, add1;
		if(!(current[1] instanceof Array)) //if we are at bottom of tree
			{
			results.push([current[0].join(""), current[1]]);
			state.pop();
			}
		else
			{
			add0 = current[0].slice();
			add0.push(0);
			add1 = current[0].slice();
			add1.push(1);
			state.pop();
			state.push([add0, current[1][0]]) 
			state.push([add1, current[1][1]]);
			}
		return [state, results];
		}

	function exploreTree()
		{
		if(tree.length == 1) return [["0", tree[0]]];

		var state = [[[0], tree[0]], [[1], tree[1]]];
		var results = [];
		var both;
		while(state.length)
			{
			both = traverse(state, results);
			state = both[0];
			results = both[1];
			}
		return results;
		}

	//return tree for navigation:
	this.tree = function() {return tree;};

	//inbuilt tree navigator (navigate one bit at a time, outputting symbol when found or false otherwise):
	this.navigate = function(n)
		{
		if(n == 0) current_navigation = current_navigation[0];
		else current_navigation = current_navigation[1];

		if(!(current_navigation instanceof Array))
			{
			var c = current_navigation;
			current_navigation = tree;
			return c;
			}
		return false;
		}

	//reset navigation so we start from beginning again.
	this.resetNavigation = function() {current_navigation = tree;}

	//return symbol->encoding pairs in an array:
	this.symbolEncodingPairs = function()
		{
		return exploreTree();
		}

	//a useful statistic:
	this.highestFrequency = function()
		{
		return highest_frequency;
		}
	this.symbolCount = function()
		{
		return unique_symbol_count;
		}
	}

