selectplus
==========

SelectPlus is a jQuery based replacement for select boxes. It supports searching, remote data sets, and infinite scrolling of results.

To see a live demo of SelectPlus, visit http://www.minamiki.com/selectplus

To use SelectPlus, simply include the JQuery plugin file with the CSS stylesheet to your HTML document. You can then add the functionality to any select box with the following code:

```javascript
$('#id-of-select-box').selectplus();
```

To load remote data sets, you will need to specify the following:


```javascript
$('#id-of-select-box').selectplus({
      remote: { 
          url: 'http://api.yourapi.com/api/data.json',
          pageSize: {label: 'page_limit', value: 20},
          page: {label: 'page', value:1},
          root: 'product',
          label: 'productname',
          value: 'productid',
          search: 'query',
          hint: 'Search a product',
          minchar: 3
      }
  });
```
All select elements replaced by SelectPlus still retains their default functionality as an input field, i.e. the selected value will still be sent on a form submit.
