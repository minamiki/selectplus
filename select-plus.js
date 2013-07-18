(function($){
	$.fn.selectplus = function(options){

		var settings = $.extend({
			// defaults
			remote: {
				url: null,
				pageSize: {label: null, value: 10},
				page: {label: null, value:1},
				root: null,
				label: null,
				value: null,
				hint: 'Type a searchterm',
				minchar: 3
			}
		
		}, options);

		// Get the options and values for the select element
		var modules = {
			// for storing the select element data
			selectdata: null,
			remotedata: null,
			elementID: null,
			searchVal: null,

			// for keeping track the remote feed
			remote: {
				page: 1,
				eof: false
			},

			// pointers to the contructed select element
			ui: {
				anchor: null,
				root: null,
				result: null,
				search: null,
				selectedDisplay: null,
				arrow: null,
				dropdown: null
			},

			// read the select's options
			parseElement: function(element){
				var selectArray = new Array();

				// iterate through the select's children
				element.children().each(function(){
					
					if($(this).is('option')){ // if it is an option element
						selectArray.push({lbl: $(this).text(), val: $(this).val()});
					}else if($(this).is('optgroup')){ // if it is an option group
						var optgroup = new Array();
						// iterate through the option group's children
						$(this).children().each(function(){
							if($(this).is('option')){
								optgroup.push({lbl: $(this).text(), val: $(this).val()});
							}
						});
						selectArray.push({val: optgroup, lbl: $(this).attr('label')});
					}
				});
				this.selectdata = selectArray;
			},

			// recontruct the select element with divs
			constructElement: function(element){
				// anchor element
				element.replaceWith('<div id="'+this.elementID+'-anchor" class="select-anchor"></div>');
				this.ui.anchor = $('#'+modules.elementID+'-anchor');

				// root element
				this.ui.anchor.append('<div id="'+this.elementID+'-ui" class="select-container"></div>');
				this.ui.root = $('#'+modules.elementID+'-ui');

				// original form element (now as a hidden element)
				this.ui.root.append('<input type="hidden" id="'+modules.elementID+'" />');

				// select element (defaults to first item on list)
				this.ui.root.append('<div class="ui-select-display"></div>');
				this.ui.selectedDisplay = $('#'+this.elementID+'-ui .ui-select-display');
				this.ui.selectedDisplay.append(this.getFirstElement());

				// select arrow
				this.ui.root.append('<div class="ui-select-arrow">&#9662;</div>');
				this.ui.arrow = $('#'+this.elementID+'-ui .ui-select-arrow');

				// wrap everything in container
				this.ui.root.append('<div class="ui-select-dropdown"></div>');
				this.ui.dropdown = $('#'+this.elementID+'-ui .ui-select-dropdown');

				// search box
				this.ui.dropdown.append('<input type="textbox" class="ui-searchbox" value="" />');
				this.ui.search = $('#'+this.elementID+'-ui .ui-searchbox');

				// add a result area
				this.ui.dropdown.append('<div class="ui-select-results"></div>');
				this.ui.result = $('#'+this.elementID+'-ui .ui-select-results');
				
				// populate result dropdown
				if(!this.checkRemote()){
					this.renderResult(this.selectdata);
				}
			},

			// initialize listeners
			initListeners: function(){
				// searchbox
				this.ui.search.keyup(function(){
					modules.searchVal = $(this).val();
					if(modules.checkRemote()){
						if(modules.searchVal.length >= 3){
							modules.search(modules.searchVal);
						}
					}else{
						modules.search(modules.searchVal);
					}
				});

				// hide the menu when clicked outisde
				$('html').click(function() {
					modules.ui.dropdown.hide();
					if(!modules.checkRemote()){
						modules.ui.search.val('');
						modules.ui.search.trigger('keyup');						
					}
				});

				// stop the propagation inside
				this.ui.root.click(function(event){
					event.stopPropagation();
				});

				// select element and arrow
				this.ui.selectedDisplay.click(function(event){
					modules.focusElement();
				});
				this.ui.arrow.click(function(event){
					modules.focusElement();
				});

				// select option
				$('#'+this.elementID+'-ui .ui-select-results').on('click', '.selectable', function(){
					// populate the original form element
					$('#'+modules.elementID).val($(this).attr('data-value'));
					modules.ui.selectedDisplay.html($(this).html());
					modules.ui.dropdown.toggle();

				});

				// result scroll
				if(this.checkRemote()){
					this.ui.result.bind('scroll', function(){
						if($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight){
							modules.loadRemote(modules.searchVal);
						}
					});					
				}
			},

			// search the select options
			search: function(searchvalue){
				if(this.checkRemote()){ // search remote data
					$.getJSON(settings.remote.url+'&'+settings.remote.search+'='+encodeURIComponent(searchvalue)+'&'+settings.remote.pageSize.label+'='+settings.remote.pageSize.value+'&'+settings.remote.page.label+'='+settings.remote.page.value+'&callback=?'
					).done(function(json){
						modules.remote.eof = false;
						modules.remote.page = 1;
						modules.ui.result.empty();
						modules.renderResult(json, settings.remote.value, settings.remote.label);
					}).fail(function(jqxhr, textStatus, error){
						var err = textStatus+', '+error;
						console.log("Request Failed: "+err);
					});
				}else{ // search local data
					var result = new Array();

					// iterate through the select options
					$.each(this.selectdata, function(){
						if(this.val instanceof Array){ // this is an optgroup
							var opt_result = new Array();
							$.each(this.val, function(){
								if(this.lbl.toLowerCase().indexOf(searchvalue.toLowerCase()) >= 0){
									opt_result.push(this);
								}
							});
							if(opt_result.length != 0){
								result.push({val: opt_result, lbl: this.lbl});
							}
						}else{ // this is an option
							if(this.lbl.toLowerCase().indexOf(searchvalue.toLowerCase()) >= 0){
								result.push(this);
							}
						}
					});

					modules.renderResult(result);
				}
			},

			// render the result
			renderResult: function(result, valueObj, labelObj){

				valueObj = typeof valueObj !== 'undefined' ? valueObj : 'val';
				labelObj = typeof labelObj !== 'undefined' ? labelObj : 'lbl';

				if(this.checkRemote()){ // remove the loader slice if remote
					this.ui.result.children().filter('span.loader').remove();
				}else{ // reset the list if local
					this.ui.result.empty();
				}
				
				var displayResult = $('<ul></ul>');
				var resultArray;

				if(this.checkRemote()){
					resultArray = eval('result.'+settings.remote.root);
				}else{
					resultArray = result;
				}
				
				// iterate through the result
				$.each(resultArray, function(){
					if(eval('this.'+valueObj) instanceof Array){ // this is an optgroup
						var optionResult = $('<li></li>');
						// render the optgroup label
						optionResult.append('<span>'+eval('this.'+labelObj)+'</span>');
						var optionGroupResult = $('<ul></ul>');
											
						$.each(eval('this.'+valueObj), function(){
							optionGroupResult.append('<li data-value="'+eval('this.'+valueObj)+'" class="selectable">'+eval('this.'+labelObj)+'</li>');
						});
						optionResult.append(optionGroupResult);					
					}else{ // this is an option
						var optionResult = '<li data-value="'+eval('this.'+valueObj)+'" class="selectable">'+eval('this.'+labelObj)+'</li>';
					}
					displayResult.append(optionResult);
				});

				// check if there are results to return
				if(displayResult.children().length == 0){
					if(!this.remote.eof){
						this.ui.result.append('<ul><li>No results</li></ul>');
					}
				}else{
					this.ui.result.append(displayResult);
				}

				// if loading from remote source, include a loading bar
				if(this.checkRemote() && !this.remote.eof){
					this.ui.result.append('<span class="loader">Loading...</span>');
				}
				
			},

			// get the first value
			getFirstElement: function(){
				if(this.checkRemote()){
					return settings.remote.hint;
				}else{
					if(this.selectdata[0].val instanceof Array){
						return this.selectdata[0].val[0].lbl
					}else{
						return this.selectdata[0].lbl;
					}					
				}
			},

			// focus select element
			focusElement: function(){
				$('.select-anchor').removeClass('focus');
				this.ui.anchor.toggleClass('focus');
				modules.ui.dropdown.toggle();
			},

			// check if using remote data
			checkRemote: function(){
				if(settings.remote.url != null){
					return true;
				}else{
					return false;
				}

			},

			// load from remote
			loadRemote: function(searchvalue){
				if(this.checkRemote() && !modules.remote.eof){
					$.getJSON(settings.remote.url+'&'+settings.remote.search+'='+encodeURIComponent(searchvalue)+'&'+settings.remote.pageSize.label+'='+settings.remote.pageSize.value+'&'+settings.remote.page.label+'='+modules.remote.page+'&callback=?'
					).done(function(json){
						if(eval('json.'+settings.remote.root+'.length') == 0){
							modules.remote.eof = true;
							modules.renderResult(json);
						}else{
							modules.renderResult(json, settings.remote.value, settings.remote.label);
						}
					}).fail(function(jqxhr, textStatus, error){
						var err = textStatus+', '+error;
						console.log("Request Failed: "+err);
					});
				}
				this.remote.page++;
			},

			// initialise the module
			init: function(element){
				if(this.checkRemote()){
					this.remote.page = settings.remote.page.value;
				}else{
					modules.parseElement(element);
				}

				modules.elementID = element.attr('id');
				modules.constructElement(element);
				modules.initListeners();	
			}

		}

		// initialise the plugin
		modules.init(this);

		return this;
	}

}(jQuery));