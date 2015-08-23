//
// Pretty pointless, as chrome at least does it 10x faster, so meh!
//

function mergeSort(array, sort_func)
	{
	if(typeof sort_func == "undefined") sort_func = function(a,b)
		{
		//sort everything as if they were strings (like the default sort algorithm):
		if(a+"" < b+"") return -1;
		else if(a+"" > b+"") return 1;
		else return 0;
		}

	function merge(first, second)
		{
		//take in 2 arrays, and output merged result by sorting first elements on each:
		var output = [], order = 0, first_index = 0, second_index = 0, first_length = first.length, second_length = second.length;
		
		while(true)
			{
			if(first_index == first_length) { output = output.concat(second.slice(second_index)); break }
			else if(second_index == second_length) { output = output.concat(first.slice(first_index)); break; }

			order = sort_func(first[first_index], second[second_index]);
			if(order >= 0) { output.push(second[second_index++]); }
			else { output.push(first[first_index++]); }
			}
		
		return output;
		}

	var l = array.length;

	//first, add elements to a new array, each inside its own array:
	var a = new Array(l);
	for(var i = 0; i < l; i++) a[i] = [array[i]];
	
	//merge arrays until there is only 1:
	var current = a, temp;
	while(current.length > 1)
		{
		temp = [];
		var current_length = current.length;
		for(var i = 0; i < current_length; i+=2) 
			{
			if(i+1 == current_length) temp.push(current[i]); 
			else temp.push(merge(current[i], current[i+1]));
			}
		current = temp;
		}

	return current[0];
	}
