'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = init;

var _uberproto = require('uberproto');

var _uberproto2 = _interopRequireDefault(_uberproto);

var _feathersQueryFilters = require('feathers-query-filters');

var _feathersQueryFilters2 = _interopRequireDefault(_feathersQueryFilters);

var _feathersErrors = require('feathers-errors');

var _feathersErrors2 = _interopRequireDefault(_feathersErrors);

var _feathersCommons = require('feathers-commons');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var operators = {
  $in: function $in(key, ins) {
    return function (current) {
      return ins.includes(current[key]);
    };
  },
  $nin: function $nin(key, nins) {
    return function (current) {
      return nins.includes(current[key]);
    };
  },
  $lt: function $lt(key, value) {
    return function (current) {
      return current[key] < value;
    };
  },
  $lte: function $lte(key, value) {
    return function (current) {
      return current[key] <= value;
    };
  },
  $gt: function $gt(key, value) {
    return function (current) {
      return current[key] > value;
    };
  },
  $gte: function $gte(key, value) {
    return function (current) {
      return current[key] >= value;
    };
  },
  $ne: function $ne(key, value) {
    return function (current) {
      return current[key] !== value;
    };
  },
  $contains: function $contains(key, value) {
    return function (current) {
      return current[key].includes(value);
    };
  },
  $like: function $like(key, value) {
    return function (current) {
      return current[key].toLowerCase().includes(trimPercent(value).toLowerCase());
    };
  }
};

var matcher = function matcher(originalQuery) {
  var query = _feathersCommons._.omit(originalQuery, '$limit', '$skip', '$sort', '$select');

  return function match(item) {
    if (query.$or && _feathersCommons._.some(query.$or, function (or) {
      return matcher(or)(item);
    })) {
      return true;
    }

    return _feathersCommons._.every(query, function (value, key) {
      if (value !== null && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
        return _feathersCommons._.every(value, function (target, filterType) {
          if (operators[filterType]) {
            var filterer = operators[filterType](key, target);
            return filterer(item);
          }

          return false;
        });
      } else if (typeof item[key] !== 'undefined') {
        return item[key] === query[key];
      }

      return false;
    });
  };
};

var Service = function () {
  function Service() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Service);

    this.paginate = options.paginate || {};
    this._id = this.id = options.idField || options.id || 'id';
    this._uId = options.startId || 0;
    this.store = options.store || {};
    this.events = options.events || [];
    this._matcher = options.matcher || matcher;
    this._sorter = options.sorter || _feathersCommons.sorter;
  }

  _createClass(Service, [{
    key: 'extend',
    value: function extend(obj) {
      return _uberproto2.default.extend(obj, this);
    }

    // Find without hooks and mixins that can be used internally and always returns
    // a pagination object

  }, {
    key: '_find',
    value: function _find(params) {
      var getFilter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _feathersQueryFilters2.default;

      var _getFilter = getFilter(params.query || {}),
          query = _getFilter.query,
          filters = _getFilter.filters;

      var values = _feathersCommons._.values(this.store).filter(this._matcher(query));

      var total = values.length;

      if (filters.$sort) {
        values.sort(this._sorter(filters.$sort));
      }

      if (filters.$skip) {
        values = values.slice(filters.$skip);
      }

      if (typeof filters.$limit !== 'undefined') {
        values = values.slice(0, filters.$limit);
      }

      if (filters.$select) {
        values = values.map(function (value) {
          return _feathersCommons._.pick.apply(_feathersCommons._, [value].concat(_toConsumableArray(filters.$select)));
        });
      }

      return Promise.resolve({
        total: total,
        limit: filters.$limit,
        skip: filters.$skip || 0,
        data: values
      });
    }
  }, {
    key: 'find',
    value: function find(params) {
      var paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
      // Call the internal find with query parameter that include pagination
      var result = this._find(params, function (query) {
        return (0, _feathersQueryFilters2.default)(query, paginate);
      });

      if (!(paginate && paginate.default)) {
        return result.then(function (page) {
          return page.data;
        });
      }

      return result;
    }
  }, {
    key: 'get',
    value: function get(id, params) {
      if (id in this.store) {
        return Promise.resolve(this.store[id]).then((0, _feathersCommons.select)(params, this.id));
      }

      return Promise.reject(new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\''));
    }

    // Create without hooks and mixins that can be used internally

  }, {
    key: '_create',
    value: function _create(data, params) {
      var id = data[this._id] || this._uId++;
      var current = _feathersCommons._.extend({}, data, _defineProperty({}, this._id, id));

      return Promise.resolve(this.store[id] = current).then((0, _feathersCommons.select)(params, this.id));
    }
  }, {
    key: 'create',
    value: function create(data, params) {
      var _this = this;

      if (Array.isArray(data)) {
        return Promise.all(data.map(function (current) {
          return _this._create(current);
        }));
      }

      return this._create(data, params);
    }

    // Update without hooks and mixins that can be used internally

  }, {
    key: '_update',
    value: function _update(id, data, params) {
      if (id in this.store) {
        // We don't want our id to change type if it can be coerced
        var oldId = this.store[id][this._id];

        id = oldId == id ? oldId : id; // eslint-disable-line

        data = _feathersCommons._.extend({}, data, _defineProperty({}, this._id, id));
        this.store[id] = data;

        return Promise.resolve(this.store[id]).then((0, _feathersCommons.select)(params, this.id));
      }

      return Promise.reject(new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\''));
    }
  }, {
    key: 'update',
    value: function update(id, data, params) {
      if (id === null || Array.isArray(data)) {
        return Promise.reject(new _feathersErrors2.default.BadRequest('You can not replace multiple instances. Did you mean \'patch\'?'));
      }

      return this._update(id, data, params);
    }

    // Patch without hooks and mixins that can be used internally

  }, {
    key: '_patch',
    value: function _patch(id, data, params) {
      if (id in this.store) {
        _feathersCommons._.extend(this.store[id], _feathersCommons._.omit(data, this._id));

        return Promise.resolve(this.store[id]).then((0, _feathersCommons.select)(params, this.id));
      }

      return Promise.reject(new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\''));
    }
  }, {
    key: 'patch',
    value: function patch(id, data, params) {
      var _this2 = this;

      if (id === null) {
        return this._find(params).then(function (page) {
          return Promise.all(page.data.map(function (current) {
            return _this2._patch(current[_this2._id], data, params);
          }));
        });
      }

      return this._patch(id, data, params);
    }

    // Remove without hooks and mixins that can be used internally

  }, {
    key: '_remove',
    value: function _remove(id, params) {
      if (id in this.store) {
        var deleted = this.store[id];
        delete this.store[id];

        return Promise.resolve(deleted).then((0, _feathersCommons.select)(params, this.id));
      }

      return Promise.reject(new _feathersErrors2.default.NotFound('No record found for id \'' + id + '\''));
    }
  }, {
    key: 'remove',
    value: function remove(id, params) {
      var _this3 = this;

      if (id === null) {
        return this._find(params).then(function (page) {
          return Promise.all(page.data.map(function (current) {
            return _this3._remove(current[_this3._id], params);
          }));
        });
      }

      return this._remove(id, params);
    }
  }]);

  return Service;
}();

function init(options) {
  return new Service(options);
}

init.Service = Service;
module.exports = exports['default'];