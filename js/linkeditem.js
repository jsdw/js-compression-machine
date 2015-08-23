//
// LinkedItem object; a lightweight linkedlist style container item.
//


function LinkedItem(stuff) //each argument is made into new Linkeditem which is added to list.
	{
	if(!(this instanceof LinkedItem)) return new LinkedItem(stuff);

	//# Contents:
	this.contents = stuff;
	this.insertAfter.apply(this, Array.prototype.slice.call(arguments, 1));

	return this;
	}

//navigating:
LinkedItem.prototype.next = function(n) 
	{ 
	if(typeof n == "undefined" || n == 1) return this.__next;

	var current = this;
	for(var i = 0; i < n; i++) 
		if(current instanceof LinkedItem) current = current.next();
		else return current;

	return current;
	}

LinkedItem.prototype.previous = function(n) 
	{ 
	if(typeof n == "undefined" || n == 1) return this.__previous;

	var current = this;
	for(var i = 0; i < n; i++) 
		if(current instanceof LinkedItem) current = current.previous();
		else return current;

	return current;
	}

//clone linkeditem from position and return reference to beginning of it:
LinkedItem.prototype.clone = function(n)
	{
	if(typeof n == "undefined") n = 1;
	else if(n <= 0) n = Infinity;

	var ni = new LinkedItem(this.contents);
	var nc = ni;
	var current = this.next();

	var count = 1;
	while(current && count++ < n)
		{
		nc = nc.insertAfter(current.contents);
		current = current.next();
		}

	return ni;
	}

//join in other LinkedItem list (from position provided until either end or number):
LinkedItem.prototype.insertListAfter = function(list, number)
	{
	if(list == this) return false;
	if(typeof number == "undefined") number = 1;
	else if(number <= 0) number = Infinity;

	var count = 1, list_end = list;
	while(typeof list_end.next() != "undefined" && count < number)
		{
		list_end = list_end.next();
		count++;
		}
	if(list.previous()) list.previous().__next = list_end.__next;
	if(list_end.next()) list_end.next().__previous = list.__previous;

	var next = this.__next;
	list.__previous = this;
	list_end.__next = next;

	this.__next = list;
	if(next) next.__previous = list_end;

	return list_end;
	}

LinkedItem.prototype.insertListBefore = function(list, number)
	{
	if(list == this) return false;
	if(typeof number == "undefined") number = 1;
	else if(number <= 0) number = Infinity;

	var count = 1, list_end = list;
	while(typeof list_end.next() != "undefined" && count < number)
		{
		list_end = list_end.next();
		count++;
		}
	if(list.previous()) list.previous().__next = list_end.__next;
	if(list_end.next()) list_end.next().__previous = list.__previous;

	var previous = this.__previous;
	list.__previous = previous;
	list_end.__next = this;

	this.__previous = list_end;
	if(previous) previous.__next = list;

	return list;
	}

//Adding new items (it'll add a string of items, one for each argument given):
LinkedItem.prototype.insertAfter = function()
		{
		var current = this;
		for(var k = 0; k < arguments.length; k++)
			{
			var i = new LinkedItem(arguments[k]);

			if(current.__next instanceof LinkedItem)
				{
				current.__next.__previous = i;
				i.__next = current.__next;
				}
			i.__previous = current;
			current.__next = i;
			current = i;
			}
		return i;
		};

//same as above except it joins the string of new items in before the current one:
LinkedItem.prototype.insertBefore = function()
	{
	var current = this;
	for(var k = arguments.length-1; k >= 0; --k)
		{
		var i = new LinkedItem(arguments[k]);

		if(current.__previous instanceof LinkedItem)
			{
			current.__previous.__next = i;
			i.__previous = current.__previous;
			}
		i.__next = current;
		current.__previous = i;
		current = i;
		}
	return i;
	};

//returning content:
LinkedItem.prototype.getContents = function(number, a) //a = optional array to append contents too.
	{
	if(typeof number == "undefined") number = 1;
	else if(number < 1) number = Infinity;

	if(!(a instanceof Array)) a = [];

	var item = this;
	var count = 0;
	while(item instanceof LinkedItem && count < number)
		{
		a.push(item.contents);
		item = item.next();
		++count;
		}
	return a;
	}

//get length from here to end of list:
LinkedItem.prototype.length = function()
	{
	var count = 0;
	var item = this;
	while(item)
		{
		++count;
		item = item.next();
		}
	return count;
	}

//get position from beginning of list:
LinkedItem.prototype.index = function()
	{
	var count = 0;
	var item = this.previous();
	while(item)
		{
		++count;
		item = item.previous();
		}
	return count;
	}


//remove all links to and from this item, joining surrounding items if needbe:
LinkedItem.prototype.unlink = function()
	{
	var n = this.__next, p = this.__previous;
	if(n instanceof LinkedItem) n.__previous = p;
	if(p instanceof LinkedItem) p.__next = n;
	this.__next = undefined;
	this.__previous = undefined;
	}

//remove all items after this one:
LinkedItem.prototype.unlinkAfter = function()
	{
	var n = this.__next, d;
	while(n)
		{
		d = n;
		n = n.__next;
		d.unlink();
		}
	return this;
	}

//remove all items before this one:
LinkedItem.prototype.unlinkBefore = function()
	{
	var n = this.__previous, d;
	while(n)
		{
		d = n;
		n = n.__previous;
		d.unlink();
		}
	return this;
	}

//unlink the whole list that this item belongs too,
//(so that if no more references outside list, it will be proprly garbage collected):
LinkedItem.prototype.unlinkAll = function()
	{
	this.unlinkAfter();
	this.unlinkBefore();
	}
