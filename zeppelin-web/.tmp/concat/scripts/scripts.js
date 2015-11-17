/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp', [
    'ngAnimate',
    'ngCookies',
    'ngRoute',
    'ngSanitize',
    'angular-websocket',
    'ui.ace',
    'ui.bootstrap',
    'ui.sortable',
    'ngTouch',
    'ngDragDrop',
    'angular.filter',
    'monospaced.elastic',
    'puElasticInput',
    'xeditable',
    'ngToast'
  ])
  .filter('breakFilter', function() {
    return function (text) {
      if (!!text) {
        return text.replace(/\n/g, '<br />');
      }
    };
  })
  .config(["$routeProvider", "ngToastProvider", function ($routeProvider, ngToastProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'app/home/home.html'
      })
      .when('/notebook/:noteId', {
        templateUrl: 'app/notebook/notebook.html',
        controller: 'NotebookCtrl'
      })
      .when('/notebook/:noteId/paragraph/:paragraphId?', {
        templateUrl: 'app/notebook/notebook.html',
        controller: 'NotebookCtrl'
      })
      .when('/interpreter', {
        templateUrl: 'app/interpreter/interpreter.html',
        controller: 'InterpreterCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  
    ngToastProvider.configure({
      dismissButton: true,
      dismissOnClick: false,
      timeout: 6000
    });
  }]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').controller('MainCtrl', ["$scope", "$rootScope", "$window", function($scope, $rootScope, $window) {
  $rootScope.compiledScope = $scope.$new(true, $rootScope);
  $scope.looknfeel = 'default';

  var init = function() {
    $scope.asIframe = (($window.location.href.indexOf('asIframe') > -1) ? true : false);
  };
  
  init();

  $rootScope.$on('setIframe', function(event, data) {
    if (!event.defaultPrevented) {
      $scope.asIframe = data;
      event.preventDefault();
    }
  });

  $rootScope.$on('setLookAndFeel', function(event, data) {
    if (!event.defaultPrevented && data && data !== '' && data !== $scope.looknfeel) {
      $scope.looknfeel = data;
      event.preventDefault();
    }
  });
  
  // Set The lookAndFeel to default on every page
  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    $rootScope.$broadcast('setLookAndFeel', 'default');
  });

}]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').controller('HomeCtrl', ["$scope", "notebookListDataFactory", "websocketMsgSrv", "$rootScope", "arrayOrderingSrv", function($scope, notebookListDataFactory, websocketMsgSrv, $rootScope, arrayOrderingSrv) {
  
  var vm = this;
  vm.notes = notebookListDataFactory;
  vm.websocketMsgSrv = websocketMsgSrv;
  vm.arrayOrderingSrv = arrayOrderingSrv;

  vm.notebookHome = false;
  vm.staticHome = false;
  
  var initHome = function() {
    websocketMsgSrv.getHomeNotebook();
  };

  initHome();

  $scope.$on('setNoteContent', function(event, note) {
    if (note) {
      vm.note = note;

      // initialize look And Feel
      $rootScope.$broadcast('setLookAndFeel', 'home');

      // make it read only
      vm.viewOnly = true;

      vm.notebookHome = true;
      vm.staticHome = false;
    } else {
      vm.staticHome = true;
      vm.notebookHome = false;
    }
  });
}]);

/* global confirm:false, alert:false */
/* jshint loopfunc: true */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').controller('NotebookCtrl', ["$scope", "$route", "$routeParams", "$location", "$rootScope", "$http", "websocketMsgSrv", "baseUrlSrv", "$timeout", "SaveAsService", function($scope, $route, $routeParams, $location,
                                                                     $rootScope, $http, websocketMsgSrv, baseUrlSrv,
                                                                     $timeout, SaveAsService) {
  $scope.note = null;
  $scope.showEditor = false;
  $scope.editorToggled = false;
  $scope.tableToggled = false;
  $scope.viewOnly = false;
  $scope.showSetting = false;
  $scope.looknfeelOption = [ 'default', 'simple', 'report'];
  $scope.cronOption = [
    {name: 'None', value : undefined},
    {name: '1m', value: '0 0/1 * * * ?'},
    {name: '5m', value: '0 0/5 * * * ?'},
    {name: '1h', value: '0 0 0/1 * * ?'},
    {name: '3h', value: '0 0 0/3 * * ?'},
    {name: '6h', value: '0 0 0/6 * * ?'},
    {name: '12h', value: '0 0 0/12 * * ?'},
    {name: '1d', value: '0 0 0 * * ?'}
  ];

  $scope.interpreterSettings = [];
  $scope.interpreterBindings = [];
  $scope.isNoteDirty = null;
  $scope.saveTimer = null;

  var angularObjectRegistry = {};
  var connectedOnce = false;

  $scope.$on('setConnectedStatus', function(event, param) {
    if(connectedOnce && param){
      initNotebook();
    }
    connectedOnce = true;
  });

  $scope.getCronOptionNameFromValue = function(value) {
    if (!value) {
      return '';
    }

    for (var o in $scope.cronOption) {
      if ($scope.cronOption[o].value===value) {
        return $scope.cronOption[o].name;
      }
    }
    return value;
  };

  /** Init the new controller */
  var initNotebook = function() {
    websocketMsgSrv.getNotebook($routeParams.noteId);
  };

  initNotebook();

  /** Remove the note and go back tot he main page */
  /** TODO(anthony): In the nearly future, go back to the main page and telle to the dude that the note have been remove */
  $scope.removeNote = function(noteId) {
    var result = confirm('Do you want to delete this notebook?');
    if (result) {
      websocketMsgSrv.deleteNotebook(noteId);
      $location.path('/#');
    }
  };

  //Export notebook
  $scope.exportNotebook = function() {
    var jsonContent = JSON.stringify($scope.note);
    SaveAsService.SaveAs(jsonContent, $scope.note.name, 'json');
  };

  //Clone note
  $scope.cloneNote = function(noteId) {
    var result = confirm('Do you want to clone this notebook?');
    if (result) {
      websocketMsgSrv.cloneNotebook(noteId);
      $location.path('/#');
    }
  };

  $scope.runNote = function() {
    var result = confirm('Run all paragraphs?');
    if (result) {
      _.forEach($scope.note.paragraphs, function(n, key) {
        angular.element('#' + n.id + '_paragraphColumn_main').scope().runParagraph(n.text);
      });
    }
  };

  $scope.saveNote = function() {
    if ($scope.note && $scope.note.paragraphs) {
      _.forEach($scope.note.paragraphs, function(n, key) {
        angular.element('#' + n.id + '_paragraphColumn_main').scope().saveParagraph();
      });
      $scope.isNoteDirty = null;
    }
  };

  $scope.clearAllParagraphOutput = function() {
    var result = confirm('Do you want to clear all output?');
    if (result) {
      _.forEach($scope.note.paragraphs, function(n, key) {
        angular.element('#' + n.id + '_paragraphColumn_main').scope().clearParagraphOutput();
      });
    }
  };

  $scope.toggleAllEditor = function() {
    if ($scope.editorToggled) {
      $scope.$broadcast('openEditor');
    } else {
      $scope.$broadcast('closeEditor');
    }
    $scope.editorToggled = !$scope.editorToggled;
  };

  $scope.showAllEditor = function() {
    $scope.$broadcast('openEditor');
  };

  $scope.hideAllEditor = function() {
    $scope.$broadcast('closeEditor');
  };

  $scope.toggleAllTable = function() {
    if ($scope.tableToggled) {
      $scope.$broadcast('openTable');
    } else {
      $scope.$broadcast('closeTable');
    }
    $scope.tableToggled = !$scope.tableToggled;
  };

  $scope.showAllTable = function() {
    $scope.$broadcast('openTable');
  };

  $scope.hideAllTable = function() {
    $scope.$broadcast('closeTable');
  };

  $scope.isNoteRunning = function() {
    var running = false;
    if(!$scope.note){ return false; }
    for (var i=0; i<$scope.note.paragraphs.length; i++) {
      if ( $scope.note.paragraphs[i].status === 'PENDING' || $scope.note.paragraphs[i].status === 'RUNNING') {
        running = true;
        break;
      }
    }
    return running;
  };

  $scope.killSaveTimer = function() {
    if ($scope.saveTimer) {
      $timeout.cancel($scope.saveTimer);
      $scope.saveTimer = null;
    }
  };

  $scope.startSaveTimer = function() {
    $scope.killSaveTimer();
    $scope.isNoteDirty = true;
    //console.log('startSaveTimer called ' + $scope.note.id);
    $scope.saveTimer = $timeout(function(){
      $scope.saveNote();
    }, 10000);
  };

  angular.element(window).on('beforeunload', function(e) {
    $scope.killSaveTimer();
    $scope.saveNote();
  });

  $scope.$on('$destroy', function() {
    angular.element(window).off('beforeunload');
    $scope.killSaveTimer();
    $scope.saveNote();
  });

  $scope.setLookAndFeel = function(looknfeel) {
    $scope.note.config.looknfeel = looknfeel;
    $scope.setConfig();
  };

  /** Set cron expression for this note **/
  $scope.setCronScheduler = function(cronExpr) {
    $scope.note.config.cron = cronExpr;
    $scope.setConfig();
  };

  /** Update note config **/
  $scope.setConfig = function(config) {
    if(config) {
      $scope.note.config = config;
    }
    websocketMsgSrv.updateNotebook($scope.note.id, $scope.note.name, $scope.note.config);
  };

  /** Update the note name */
  $scope.sendNewName = function() {
    $scope.showEditor = false;
    if ($scope.note.name) {
      websocketMsgSrv.updateNotebook($scope.note.id, $scope.note.name, $scope.note.config);
    }
  };

  /** update the current note */
  $scope.$on('setNoteContent', function(event, note) {
    $scope.paragraphUrl = $routeParams.paragraphId;
    $scope.asIframe = $routeParams.asIframe;
    if ($scope.paragraphUrl) {
      note = cleanParagraphExcept($scope.paragraphUrl, note);
      $rootScope.$broadcast('setIframe', $scope.asIframe);
    }

    if ($scope.note === null) {
      $scope.note = note;
    } else {
      updateNote(note);
    }
    initializeLookAndFeel();
    //open interpreter binding setting when there're none selected
    getInterpreterBindings(getInterpreterBindingsCallBack);
  });


  var initializeLookAndFeel = function() {
    if (!$scope.note.config.looknfeel) {
      $scope.note.config.looknfeel = 'default';
    } else {
      $scope.viewOnly = $scope.note.config.looknfeel === 'report' ? true : false;
    }
    $rootScope.$broadcast('setLookAndFeel', $scope.note.config.looknfeel);
  };

  var cleanParagraphExcept = function(paragraphId, note) {
    var noteCopy = {};
    noteCopy.id = note.id;
    noteCopy.name = note.name;
    noteCopy.config = note.config;
    noteCopy.info = note.info;
    noteCopy.paragraphs = [];
    for (var i=0; i<note.paragraphs.length; i++) {
      if (note.paragraphs[i].id === paragraphId) {
        noteCopy.paragraphs[0] = note.paragraphs[i];
        if (!noteCopy.paragraphs[0].config) {
          noteCopy.paragraphs[0].config = {};
        }
        noteCopy.paragraphs[0].config.editorHide = true;
        noteCopy.paragraphs[0].config.tableHide = false;
        break;
      }
    }
    return noteCopy;
  };

  $scope.$on('moveParagraphUp', function(event, paragraphId) {
    var newIndex = -1;
    for (var i=0; i<$scope.note.paragraphs.length; i++) {
      if ($scope.note.paragraphs[i].id === paragraphId) {
        newIndex = i-1;
        break;
      }
    }

    if (newIndex<0 || newIndex>=$scope.note.paragraphs.length) {
      return;
    }
    websocketMsgSrv.moveParagraph(paragraphId, newIndex);
  });

  // create new paragraph on current position
  $scope.$on('insertParagraph', function(event, paragraphId) {
    var newIndex = -1;
    for (var i=0; i<$scope.note.paragraphs.length; i++) {
      if ($scope.note.paragraphs[i].id === paragraphId) {
        newIndex = i+1;
        break;
      }
    }

    if (newIndex === $scope.note.paragraphs.length) {
      alert('Cannot insert after the last paragraph.');
      return;
    }
    if (newIndex < 0 || newIndex > $scope.note.paragraphs.length) {
      return;
    }
    websocketMsgSrv.insertParagraph(newIndex);
  });

  $scope.$on('moveParagraphDown', function(event, paragraphId) {
    var newIndex = -1;
    for (var i=0; i<$scope.note.paragraphs.length; i++) {
      if ($scope.note.paragraphs[i].id === paragraphId) {
        newIndex = i+1;
        break;
      }
    }

    if (newIndex<0 || newIndex>=$scope.note.paragraphs.length) {
      return;
    }
    websocketMsgSrv.moveParagraph(paragraphId, newIndex);
  });

  $scope.$on('moveFocusToPreviousParagraph', function(event, currentParagraphId){
    var focus = false;
    for (var i=$scope.note.paragraphs.length-1; i>=0; i--) {
      if (focus === false ) {
        if ($scope.note.paragraphs[i].id === currentParagraphId) {
          focus = true;
          continue;
        }
      } else {
        var p = $scope.note.paragraphs[i];
        if (!p.config.hide && !p.config.editorHide) {
          $scope.$broadcast('focusParagraph', $scope.note.paragraphs[i].id, -1);
          break;
        }
      }
    }
  });

  $scope.$on('moveFocusToNextParagraph', function(event, currentParagraphId){
    var focus = false;
    for (var i=0; i<$scope.note.paragraphs.length; i++) {
      if (focus === false ) {
        if ($scope.note.paragraphs[i].id === currentParagraphId) {
          focus = true;
          continue;
        }
      } else {
        var p = $scope.note.paragraphs[i];
        if (!p.config.hide && !p.config.editorHide) {
          $scope.$broadcast('focusParagraph', $scope.note.paragraphs[i].id, 0);
          break;
        }
      }
    }
  });

  var updateNote = function(note) {
    /** update Note name */
    if (note.name !== $scope.note.name) {
      console.log('change note name: %o to %o', $scope.note.name, note.name);
      $scope.note.name = note.name;
    }

    $scope.note.config = note.config;
    $scope.note.info = note.info;

    var newParagraphIds = note.paragraphs.map(function(x) {return x.id;});
    var oldParagraphIds = $scope.note.paragraphs.map(function(x) {return x.id;});

    var numNewParagraphs = newParagraphIds.length;
    var numOldParagraphs = oldParagraphIds.length;

    /** add a new paragraph */
    if (numNewParagraphs > numOldParagraphs) {
      for (var index in newParagraphIds) {
        if (oldParagraphIds[index] !== newParagraphIds[index]) {
          $scope.note.paragraphs.splice(index, 0, note.paragraphs[index]);
          break;
        }
      }
    }

    /** update or move paragraph */
    if (numNewParagraphs === numOldParagraphs) {
      for (var idx in newParagraphIds) {
        var newEntry = note.paragraphs[idx];
        if (oldParagraphIds[idx] === newParagraphIds[idx]) {
          $scope.$broadcast('updateParagraph', {paragraph: newEntry});
        } else {
          // move paragraph
          var oldIdx = oldParagraphIds.indexOf(newParagraphIds[idx]);
          $scope.note.paragraphs.splice(oldIdx, 1);
          $scope.note.paragraphs.splice(idx, 0, newEntry);
          // rebuild id list since paragraph has moved.
          oldParagraphIds = $scope.note.paragraphs.map(function(x) {return x.id;});
        }
      }
    }

    /** remove paragraph */
    if (numNewParagraphs < numOldParagraphs) {
      for (var oldidx in oldParagraphIds) {
        if(oldParagraphIds[oldidx] !== newParagraphIds[oldidx]) {
          $scope.note.paragraphs.splice(oldidx, 1);
          break;
        }
      }
    }
  };

  var getInterpreterBindings = function(callback) {
    $http.get(baseUrlSrv.getRestApiBase()+ '/notebook/interpreter/bind/' +$scope.note.id).
    success(function(data, status, headers, config) {
      $scope.interpreterBindings = data.body;
      $scope.interpreterBindingsOrig = jQuery.extend(true, [], $scope.interpreterBindings); // to check dirty
      if (callback) {
        callback();
      }
    }).
    error(function(data, status, headers, config) {
      if (status !== 0) {
        console.log('Error %o %o', status, data.message);
      }
    });
  };

  var getInterpreterBindingsCallBack = function() {
    var selected = false;
    var key;
    var setting;

    for (key in $scope.interpreterBindings) {
      setting = $scope.interpreterBindings[key];
      if (setting.selected) {
        selected = true;
        break;
      }
    }

    if (!selected) {
      // make default selection
      var selectedIntp = {};
      for (key in $scope.interpreterBindings) {
        setting = $scope.interpreterBindings[key];
        if (!selectedIntp[setting.group]) {
          setting.selected = true;
          selectedIntp[setting.group] = true;
        }
      }
      $scope.showSetting = true;
    }
  };

  $scope.interpreterSelectionListeners = {
    accept : function(sourceItemHandleScope, destSortableScope) {return true;},
    itemMoved: function (event) {},
    orderChanged: function(event) {}
  };

  $scope.openSetting = function() {
    $scope.showSetting = true;
    getInterpreterBindings();
  };

  $scope.closeSetting = function() {
    if (isSettingDirty()) {
      var result = confirm('Changes will be discarded');
      if (!result) {
        return;
      }
    }
    $scope.showSetting = false;
  };

  $scope.saveSetting = function() {
    var selectedSettingIds = [];
    for (var no in $scope.interpreterBindings) {
      var setting = $scope.interpreterBindings[no];
      if (setting.selected) {
        selectedSettingIds.push(setting.id);
      }
    }

    $http.put(baseUrlSrv.getRestApiBase() + '/notebook/interpreter/bind/' + $scope.note.id,
              selectedSettingIds).
    success(function(data, status, headers, config) {
      console.log('Interpreter binding %o saved', selectedSettingIds);
      $scope.showSetting = false;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.toggleSetting = function() {
    if ($scope.showSetting) {
      $scope.closeSetting();
    } else {
      $scope.openSetting();
    }
  };

  var isSettingDirty = function() {
    if (angular.equals($scope.interpreterBindings, $scope.interpreterBindingsOrig)) {
      return false;
    } else {
      return true;
    }
  };

  $scope.$on('angularObjectUpdate', function(event, data) {
    if (data.noteId === $scope.note.id) {
      var scope = $rootScope.compiledScope;
      var varName = data.angularObject.name;

      if (angular.equals(data.angularObject.object, scope[varName])) {
        // return when update has no change
        return;
      }

      if (!angularObjectRegistry[varName]) {
        angularObjectRegistry[varName] = {
          interpreterGroupId : data.interpreterGroupId,
        };
      }

      angularObjectRegistry[varName].skipEmit = true;

      if (!angularObjectRegistry[varName].clearWatcher) {
        angularObjectRegistry[varName].clearWatcher = scope.$watch(varName, function(newValue, oldValue) {
          if (angularObjectRegistry[varName].skipEmit) {
            angularObjectRegistry[varName].skipEmit = false;
            return;
          }
          websocketMsgSrv.updateAngularObject($routeParams.noteId, varName, newValue, angularObjectRegistry[varName].interpreterGroupId);
        });
      }
      scope[varName] = data.angularObject.object;
    }
  });

  $scope.$on('angularObjectRemove', function(event, data) {
    if (!data.noteId || data.noteId === $scope.note.id) {
      var scope = $rootScope.compiledScope;
      var varName = data.name;

      // clear watcher
      if (angularObjectRegistry[varName]) {
        angularObjectRegistry[varName].clearWatcher();
        angularObjectRegistry[varName] = undefined;
      }

      // remove scope variable
      scope[varName] = undefined;
    }
  });

}]);

/* global confirm:false, alert:false, _:false */
/* jshint loopfunc: true */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').controller('InterpreterCtrl', ["$scope", "$route", "$routeParams", "$location", "$rootScope", "$http", "baseUrlSrv", function($scope, $route, $routeParams, $location, $rootScope,
                                                                         $http, baseUrlSrv) {
  var interpreterSettingsTmp = [];
  $scope.interpreterSettings = [];
  $scope.availableInterpreters = {};
  $scope.showAddNewSetting = false;

  var getInterpreterSettings = function() {
    $http.get(baseUrlSrv.getRestApiBase()+'/interpreter/setting').
    success(function(data, status, headers, config) {
      $scope.interpreterSettings = data.body;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  var getAvailableInterpreters = function() {
    $http.get(baseUrlSrv.getRestApiBase()+'/interpreter').
    success(function(data, status, headers, config) {
      $scope.availableInterpreters = data.body;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  var emptyNewProperty = function(object) {
    angular.extend(object, {propertyValue: '', propertyKey: ''});
  };

  var removeTMPSettings = function(index) {
    interpreterSettingsTmp.splice(index, 1);
  };

  $scope.copyOriginInterpreterSettingProperties = function(settingId) {
    var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
    interpreterSettingsTmp[index] = angular.copy($scope.interpreterSettings[index]);
  };

  $scope.updateInterpreterSetting = function(settingId) {
    var result = confirm('Do you want to update this interpreter and restart with new settings?');
    if (!result) {
      return;
    }

    var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });

    var request = {
      properties : angular.copy($scope.interpreterSettings[index].properties),
    };


    $http.put(baseUrlSrv.getRestApiBase() + '/interpreter/setting/' + settingId, request).
    success(function(data, status, headers, config) {
      $scope.interpreterSettings[index] = data.body;
      removeTMPSettings(index);
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.resetInterpreterSetting = function(settingId){
    var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });

    // Set the old settings back
    $scope.interpreterSettings[index] = angular.copy(interpreterSettingsTmp[index]);
    removeTMPSettings(index);
  };

  $scope.removeInterpreterSetting = function(settingId) {
    var result = confirm('Do you want to delete this interpreter setting?');
    if (!result) {
      return;
    }

    $http.delete(baseUrlSrv.getRestApiBase() + '/interpreter/setting/' + settingId).
    success(function(data, status, headers, config) {

      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      $scope.interpreterSettings.splice(index, 1);
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.newInterpreterGroupChange = function() {
    var el = _.pluck(_.filter($scope.availableInterpreters, { 'group': $scope.newInterpreterSetting.group }), 'properties');
    
    var properties = {};
    for (var i=0; i < el.length; i++) {
      var intpInfo = el[i];
      for (var key in intpInfo) {
        properties[key] = {
          value : intpInfo[key].defaultValue,
          description : intpInfo[key].description
        };
      }
    }
    
    $scope.newInterpreterSetting.properties = properties;
  };

  $scope.restartInterpreterSetting = function(settingId) {
    var result = confirm('Do you want to restart this interpreter?');
    if (!result) {
      return;
    }

    $http.put(baseUrlSrv.getRestApiBase() + '/interpreter/setting/restart/' + settingId).
    success(function(data, status, headers, config) {
      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      $scope.interpreterSettings[index] = data.body;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.addNewInterpreterSetting = function() {
    if (!$scope.newInterpreterSetting.name || !$scope.newInterpreterSetting.group) {
      alert('Please determine name and interpreter');
      return;
    }

    if (_.findIndex($scope.interpreterSettings, { 'name': $scope.newInterpreterSetting.name }) >= 0) {
      alert('Name ' + $scope.newInterpreterSetting.name + ' already exists');
      return;
    }

    var newSetting = angular.copy($scope.newInterpreterSetting);

    for (var p in $scope.newInterpreterSetting.properties) {
      newSetting.properties[p] = $scope.newInterpreterSetting.properties[p].value;
    }

    $http.post(baseUrlSrv.getRestApiBase()+'/interpreter/setting', newSetting).
    success(function(data, status, headers, config) {
      $scope.resetNewInterpreterSetting();
      getInterpreterSettings();
      $scope.showAddNewSetting = false;
    }).
    error(function(data, status, headers, config) {
      console.log('Error %o %o', status, data.message);
    });
  };

  $scope.resetNewInterpreterSetting = function() {
    $scope.newInterpreterSetting = {
      name : undefined,
      group : undefined,
      properties : {}
    };
    emptyNewProperty($scope.newInterpreterSetting);
  };

  $scope.removeInterpreterProperty = function(key, settingId) {
    if (settingId === undefined) {
      delete $scope.newInterpreterSetting.properties[key];
    }
    else {
      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      delete $scope.interpreterSettings[index].properties[key];
    }
  };

  $scope.addNewInterpreterProperty = function(settingId) {
    if(settingId === undefined) {
      // Add new property from create form
      if (!$scope.newInterpreterSetting.propertyKey || $scope.newInterpreterSetting.propertyKey === '') {
        return;
      }
      
      $scope.newInterpreterSetting.properties[$scope.newInterpreterSetting.propertyKey] = {
        value: $scope.newInterpreterSetting.propertyValue
      };
      emptyNewProperty($scope.newInterpreterSetting);
    }
    else {
      // Add new property from edit form
      var index = _.findIndex($scope.interpreterSettings, { 'id': settingId });
      var setting = $scope.interpreterSettings[index];

      setting.properties[setting.propertyKey] = setting.propertyValue;
      emptyNewProperty(setting);
    }
  };

  var init = function() {
    $scope.resetNewInterpreterSetting();
    getInterpreterSettings();
    getAvailableInterpreters();
  };

  init();
}]);

/* global $:false, jQuery:false, ace:false, confirm:false, d3:false, nv:false*/
/*jshint loopfunc: true, unused:false */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp')
  .controller('ParagraphCtrl', ["$scope", "$rootScope", "$route", "$window", "$element", "$routeParams", "$location", "$timeout", "$compile", "websocketMsgSrv", function($scope,$rootScope, $route, $window, $element, $routeParams, $location,
                                         $timeout, $compile, websocketMsgSrv) {

  $scope.paragraph = null;
  $scope.editor = null;

  var editorModes = {
    'ace/mode/scala': /^%spark/,
    'ace/mode/sql': /^%(\w*\.)?\wql/,
    'ace/mode/markdown': /^%md/,
    'ace/mode/sh': /^%sh/
  };

  // Controller init
  $scope.init = function(newParagraph) {
    $scope.paragraph = newParagraph;
    $scope.chart = {};
    $scope.colWidthOption = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ];
    $scope.showTitleEditor = false;
    $scope.paragraphFocused = false;

    if (!$scope.paragraph.config) {
      $scope.paragraph.config = {};
    }

    initializeDefault();

    if ($scope.getResultType() === 'TABLE') {
      $scope.loadTableData($scope.paragraph.result);
      $scope.setGraphMode($scope.getGraphMode(), false, false);
    } else if ($scope.getResultType() === 'HTML') {
      $scope.renderHtml();
    } else if ($scope.getResultType() === 'ANGULAR') {
      $scope.renderAngular();
    }
  };

  $scope.renderHtml = function() {
    var retryRenderer = function() {
      if ($('#p'+$scope.paragraph.id+'_html').length) {
        try {
          $('#p'+$scope.paragraph.id+'_html').html($scope.paragraph.result.msg);

          $('#p'+$scope.paragraph.id+'_html').find('pre code').each(function(i, e) { hljs.highlightBlock(e); });
        } catch(err) {
          console.log('HTML rendering error %o', err);
        }
      } else {
      }
    };
    $timeout(retryRenderer);

  };

  $scope.renderAngular = function() {
    var retryRenderer = function() {
      if (angular.element('#p'+$scope.paragraph.id+'_angular').length) {
        try {
          angular.element('#p'+$scope.paragraph.id+'_angular').html($scope.paragraph.result.msg);

          $compile(angular.element('#p'+$scope.paragraph.id+'_angular').contents())($rootScope.compiledScope);
        } catch(err) {
          console.log('ANGULAR rendering error %o', err);
        }
      } else {
        $timeout(retryRenderer,10);
      }
    };
    $timeout(retryRenderer);

  };


  var initializeDefault = function() {
    var config = $scope.paragraph.config;

    if (!config.colWidth) {
      config.colWidth = 12;
    }

    if (!config.graph) {
      config.graph = {};
    }

    if (!config.graph.mode) {
      config.graph.mode = 'table';
    }

    if (!config.graph.height) {
      config.graph.height = 300;
    }

    if (!config.graph.optionOpen) {
      config.graph.optionOpen = false;
    }

    if (!config.graph.keys) {
      config.graph.keys = [];
    }

    if (!config.graph.values) {
      config.graph.values = [];
    }

    if (!config.graph.groups) {
      config.graph.groups = [];
    }

    if (!config.graph.scatter) {
      config.graph.scatter = {};
    }
  };

  $scope.getIframeDimensions = function () {
    if ($scope.asIframe) {
      var paragraphid = '#' + $routeParams.paragraphId + '_container';
      var height = $(paragraphid).height();
      return height;
    }
    return 0;
  };

  $scope.$watch($scope.getIframeDimensions, function (newValue, oldValue) {
    if ($scope.asIframe && newValue) {
      var message = {};
      message.height = newValue;
      message.url = $location.$$absUrl;
      $window.parent.postMessage(angular.toJson(message), '*');
    }
  });

  // TODO: this may have impact on performance when there are many paragraphs in a note.
  $scope.$on('updateParagraph', function(event, data) {
    if (data.paragraph.id === $scope.paragraph.id &&
        (data.paragraph.dateCreated !== $scope.paragraph.dateCreated ||
         data.paragraph.dateFinished !== $scope.paragraph.dateFinished ||
         data.paragraph.dateStarted !== $scope.paragraph.dateStarted ||
         data.paragraph.dateUpdated !== $scope.paragraph.dateUpdated ||
         data.paragraph.status !== $scope.paragraph.status ||
         data.paragraph.jobName !== $scope.paragraph.jobName ||
         data.paragraph.title !== $scope.paragraph.title ||
         data.paragraph.errorMessage !== $scope.paragraph.errorMessage ||
         !angular.equals(data.paragraph.settings, $scope.paragraph.settings) ||
         !angular.equals(data.paragraph.config, $scope.paragraph.config))
       ) {

      var oldType = $scope.getResultType();
      var newType = $scope.getResultType(data.paragraph);
      var oldGraphMode = $scope.getGraphMode();
      var newGraphMode = $scope.getGraphMode(data.paragraph);
      var resultRefreshed = (data.paragraph.dateFinished !== $scope.paragraph.dateFinished);
      var statusChanged = (data.paragraph.status !== $scope.paragraph.status);

      //console.log("updateParagraph oldData %o, newData %o. type %o -> %o, mode %o -> %o", $scope.paragraph, data, oldType, newType, oldGraphMode, newGraphMode);

      if ($scope.paragraph.text !== data.paragraph.text) {
        if ($scope.dirtyText) {         // check if editor has local update
          if ($scope.dirtyText === data.paragraph.text ) {  // when local update is the same from remote, clear local update
            $scope.paragraph.text = data.paragraph.text;
            $scope.dirtyText = undefined;
          } else { // if there're local update, keep it.
            $scope.paragraph.text = $scope.dirtyText;
          }
        } else {
          $scope.paragraph.text = data.paragraph.text;
        }
      }

      /** push the rest */
      $scope.paragraph.aborted = data.paragraph.aborted;
      $scope.paragraph.dateUpdated = data.paragraph.dateUpdated;
      $scope.paragraph.dateCreated = data.paragraph.dateCreated;
      $scope.paragraph.dateFinished = data.paragraph.dateFinished;
      $scope.paragraph.dateStarted = data.paragraph.dateStarted;
      $scope.paragraph.errorMessage = data.paragraph.errorMessage;
      $scope.paragraph.jobName = data.paragraph.jobName;
      $scope.paragraph.title = data.paragraph.title;
      $scope.paragraph.lineNumbers = data.paragraph.lineNumbers;
      $scope.paragraph.status = data.paragraph.status;
      $scope.paragraph.result = data.paragraph.result;
      $scope.paragraph.settings = data.paragraph.settings;

      if (!$scope.asIframe) {
        $scope.paragraph.config = data.paragraph.config;
        initializeDefault();
      } else {
        data.paragraph.config.editorHide = true;
        data.paragraph.config.tableHide = false;
        $scope.paragraph.config = data.paragraph.config;
      }

      if (newType === 'TABLE') {
        $scope.loadTableData($scope.paragraph.result);
        if (oldType !== 'TABLE' || resultRefreshed) {
          clearUnknownColsFromGraphOption();
          selectDefaultColsForGraphOption();
        }
        /** User changed the chart type? */
        if (oldGraphMode !== newGraphMode) {
          $scope.setGraphMode(newGraphMode, false, false);
        } else {
          $scope.setGraphMode(newGraphMode, false, true);
        }
      } else if (newType === 'HTML' && resultRefreshed) {
        $scope.renderHtml();
      } else if (newType === 'ANGULAR' && resultRefreshed) {
        $scope.renderAngular();
      }

      if (statusChanged || resultRefreshed) {
        // when last paragraph runs, zeppelin automatically appends new paragraph.
        // this broadcast will focus to the newly inserted paragraph
        $rootScope.$broadcast('scrollToCursor');
      }
    }

  });

  $scope.isRunning = function() {
    if ($scope.paragraph.status === 'RUNNING' || $scope.paragraph.status === 'PENDING') {
      return true;
    } else {
      return false;
    }
  };

  $scope.cancelParagraph = function() {
    console.log('Cancel %o', $scope.paragraph.id);
    websocketMsgSrv.cancelParagraphRun($scope.paragraph.id);
  };

  $scope.runParagraph = function(data) {
    websocketMsgSrv.runParagraph($scope.paragraph.id, $scope.paragraph.title,
                                 data, $scope.paragraph.config, $scope.paragraph.settings.params);
    $scope.dirtyText = undefined;
  };

  $scope.saveParagraph = function(){
    if($scope.dirtyText === undefined){
      return;
    }
    commitParagraph($scope.paragraph.title, $scope.dirtyText, $scope.paragraph.config, $scope.paragraph.settings.params);
    $scope.dirtyText = undefined;
  };

  $scope.moveUp = function() {
    $scope.$emit('moveParagraphUp', $scope.paragraph.id);
  };

  $scope.moveDown = function() {
    $scope.$emit('moveParagraphDown', $scope.paragraph.id);
  };

  $scope.insertNew = function() {
    $scope.$emit('insertParagraph', $scope.paragraph.id);
  };

  $scope.removeParagraph = function() {
    var result = confirm('Do you want to delete this paragraph?');
    if (result) {
      console.log('Remove paragraph');
      websocketMsgSrv.removeParagraph($scope.paragraph.id);
    }
  };

  $scope.clearParagraphOutput = function() {
    websocketMsgSrv.clearParagraphOutput($scope.paragraph.id);
  };

  $scope.toggleEditor = function() {
    if ($scope.paragraph.config.editorHide) {
      $scope.openEditor();
    } else {
      $scope.closeEditor();
    }
  };

  $scope.closeEditor = function() {
    console.log('close the note');

    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.editorHide = true;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.openEditor = function() {
    console.log('open the note');

    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.editorHide = false;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.closeTable = function() {
    console.log('close the output');

    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.tableHide = true;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.openTable = function() {
    console.log('open the output');

    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.tableHide = false;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.showTitle = function() {
    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.title = true;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.hideTitle = function() {
    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.title = false;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.setTitle = function() {
    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.showLineNumbers = function () {
    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.lineNumbers = true;
    $scope.editor.renderer.setShowGutter(true);

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.hideLineNumbers = function () {
    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.lineNumbers = false;
    $scope.editor.renderer.setShowGutter(false);

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.columnWidthClass = function(n) {
    if ($scope.asIframe) {
      return 'col-md-12';
    } else {
      return 'col-md-' + n;
    }
  };

  $scope.changeColWidth = function() {

    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.toggleGraphOption = function() {
    var newConfig = angular.copy($scope.paragraph.config);
    if (newConfig.graph.optionOpen) {
      newConfig.graph.optionOpen = false;
    } else {
      newConfig.graph.optionOpen = true;
    }
    var newParams = angular.copy($scope.paragraph.settings.params);

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.toggleOutput = function() {
    var newConfig = angular.copy($scope.paragraph.config);
    newConfig.tableHide = !newConfig.tableHide;
    var newParams = angular.copy($scope.paragraph.settings.params);

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  $scope.toggleLineWithFocus = function () {
    var mode = $scope.getGraphMode();

    if (mode === 'lineWithFocusChart') {
      $scope.setGraphMode('lineChart', true);
      return true;
    }

    if (mode === 'lineChart') {
      $scope.setGraphMode('lineWithFocusChart', true);
      return true;
    }

    return false;
  };



  $scope.loadForm = function(formulaire, params) {
    var value = formulaire.defaultValue;
    if (params[formulaire.name]) {
      value = params[formulaire.name];
    }

    if (value === '') {
      value = formulaire.options[0].value;
    }

    $scope.paragraph.settings.params[formulaire.name] = value;
  };

  $scope.aceChanged = function() {

    $scope.dirtyText = $scope.editor.getSession().getValue();
    $scope.startSaveTimer();

    $timeout(function() {
      $scope.setParagraphMode($scope.editor.getSession(), $scope.dirtyText, $scope.editor.getCursorPosition());
    });
  };

  $scope.aceLoaded = function(_editor) {
    var langTools = ace.require('ace/ext/language_tools');
    var Range = ace.require('ace/range').Range;

    _editor.$blockScrolling = Infinity;
    $scope.editor = _editor;
    if (_editor.container.id !== '{{paragraph.id}}_editor') {
      $scope.editor.renderer.setShowGutter($scope.paragraph.config.lineNumbers);
      $scope.editor.setShowFoldWidgets(false);
      $scope.editor.setHighlightActiveLine(false);
      $scope.editor.setHighlightGutterLine(false);
      $scope.editor.getSession().setUseWrapMode(true);
      $scope.editor.setTheme('ace/theme/chrome');
      $scope.editor.focus();

      autoAdjustEditorHeight(_editor.container.id);
      $(window).resize(function(){
        autoAdjustEditorHeight(_editor.container.id);
      });

      if (navigator.appVersion.indexOf('Mac') !== -1 ) {
        $scope.editor.setKeyboardHandler('ace/keyboard/emacs');
      } else if (navigator.appVersion.indexOf('Win') !== -1 ||
                 navigator.appVersion.indexOf('X11') !== -1 ||
                 navigator.appVersion.indexOf('Linux') !== -1) {
        // not applying emacs key binding while the binding override Ctrl-v. default behavior of paste text on windows.
      }

      $scope.setParagraphMode = function(session, paragraphText, pos) {
        // Evaluate the mode only if the first 30 characters of the paragraph have been modified or the the position is undefined.
        if ( (typeof pos === 'undefined') || (pos.row === 0 && pos.column < 30)) {
          // If paragraph loading, use config value if exists
          if ((typeof pos === 'undefined') && $scope.paragraph.config.editorMode) {
            session.setMode($scope.paragraph.config.editorMode);
          } else {
            // Defaults to spark mode
            var newMode = 'ace/mode/scala';
            // Test first against current mode
            var oldMode = session.getMode().$id;
            if (!editorModes[oldMode] || !editorModes[oldMode].test(paragraphText)) {
              for (var key in editorModes) {
                if (key !== oldMode) {
                  if (editorModes[key].test(paragraphText)){
                    $scope.paragraph.config.editorMode = key;
                    session.setMode(key);
                    return true;
                  }
                }
              }
              $scope.paragraph.config.editorMode = newMode;
              session.setMode(newMode);
            }
          }
        }
      };

      var remoteCompleter = {
        getCompletions : function(editor, session, pos, prefix, callback) {
          if (!$scope.editor.isFocused() ){ return;}

          pos = session.getTextRange(new Range(0, 0, pos.row, pos.column)).length;
          var buf = session.getValue();

          websocketMsgSrv.completion($scope.paragraph.id, buf, pos);

          $scope.$on('completionList', function(event, data) {
            if (data.completions) {
              var completions = [];
              for (var c in data.completions) {
                var v = data.completions[c];
                completions.push({
                  name:v,
                  value:v,
                  score:300
                });
              }
              callback(null, completions);
            }
          });
        }
      };

      langTools.setCompleters([remoteCompleter, langTools.keyWordCompleter, langTools.snippetCompleter, langTools.textCompleter]);

      $scope.editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: false,
        enableLiveAutocompletion:false
      });

      $scope.handleFocus = function(value) {
        $scope.paragraphFocused = value;
        // Protect against error in case digest is already running
        $timeout(function() {
          // Apply changes since they come from 3rd party library
          $scope.$digest();
        });
      };

      $scope.editor.on('focus', function() {
        $scope.handleFocus(true);
      });

      $scope.editor.on('blur', function() {
        $scope.handleFocus(false);
      });

      $scope.editor.getSession().on('change', function(e, editSession) {
        autoAdjustEditorHeight(_editor.container.id);
      });

      $scope.setParagraphMode($scope.editor.getSession(), $scope.editor.getSession().getValue());

      $scope.editor.commands.addCommand({
        name: 'run',
        bindKey: {win: 'Shift-Enter', mac: 'Shift-Enter'},
        exec: function(editor) {
          var editorValue = editor.getValue();
          if (editorValue) {
            $scope.runParagraph(editorValue);
          }
        },
        readOnly: false
      });

      // autocomplete on '.'
      /*
      $scope.editor.commands.on("afterExec", function(e, t) {
        if (e.command.name == "insertstring" && e.args == "." ) {
      var all = e.editor.completers;
      //e.editor.completers = [remoteCompleter];
      e.editor.execCommand("startAutocomplete");
      //e.editor.completers = all;
    }
      });
      */

      // autocomplete on 'ctrl+.'
      $scope.editor.commands.bindKey('ctrl-.', 'startAutocomplete');
      $scope.editor.commands.bindKey('ctrl-space', null);

      // handle cursor moves
      $scope.editor.keyBinding.origOnCommandKey = $scope.editor.keyBinding.onCommandKey;
      $scope.editor.keyBinding.onCommandKey = function(e, hashId, keyCode) {
        if ($scope.editor.completer && $scope.editor.completer.activated) { // if autocompleter is active
        } else {
          var numRows;
          var currentRow;

          if (keyCode === 38 || (keyCode === 80 && e.ctrlKey)) {  // UP
            numRows = $scope.editor.getSession().getLength();
            currentRow = $scope.editor.getCursorPosition().row;
            if (currentRow === 0) {
              // move focus to previous paragraph
              $scope.$emit('moveFocusToPreviousParagraph', $scope.paragraph.id);
            } else {
              $scope.scrollToCursor($scope.paragraph.id, -1);
            }
          } else if (keyCode === 40 || (keyCode === 78 && e.ctrlKey)) {  // DOWN
            numRows = $scope.editor.getSession().getLength();
            currentRow = $scope.editor.getCursorPosition().row;
            if (currentRow === numRows-1) {
              // move focus to next paragraph
              $scope.$emit('moveFocusToNextParagraph', $scope.paragraph.id);
            } else {
              $scope.scrollToCursor($scope.paragraph.id, 1);
            }
          }
        }
        this.origOnCommandKey(e, hashId, keyCode);
      };
    }
  };

  var autoAdjustEditorHeight = function(id) {
    var editor = $scope.editor;
    var height = editor.getSession().getScreenLength() * editor.renderer.lineHeight + editor.renderer.scrollBar.getWidth();

    $('#' + id).height(height.toString() + 'px');
    editor.resize();
  };

  $rootScope.$on('scrollToCursor', function(event) {
    $scope.scrollToCursor($scope.paragraph.id, 0);
  });

  /** scrollToCursor if it is necessary
   * when cursor touches scrollTriggerEdgeMargin from the top (or bottom) of the screen, it autoscroll to place cursor around 1/3 of screen height from the top (or bottom)
   * paragraphId : paragraph that has active cursor
   * lastCursorMove : 1(down), 0, -1(up) last cursor move event
   **/
  $scope.scrollToCursor = function(paragraphId, lastCursorMove) {
    if (!$scope.editor.isFocused()) {
     // only make sense when editor is focused
     return;
    }
    var lineHeight = $scope.editor.renderer.lineHeight;
    var headerHeight = 103; // menubar, notebook titlebar
    var scrollTriggerEdgeMargin = 50;
    
    var documentHeight = angular.element(document).height();
    var windowHeight = angular.element(window).height();  // actual viewport height

    var scrollPosition = angular.element(document).scrollTop();
    var editorPosition = angular.element('#'+paragraphId+'_editor').offset();
    var position = $scope.editor.getCursorPosition();
    var lastCursorPosition = $scope.editor.renderer.$cursorLayer.getPixelPosition(position, true);

    var calculatedCursorPosition = editorPosition.top + lastCursorPosition.top + 16*lastCursorMove;

    var scrollTargetPos;
    if (calculatedCursorPosition < scrollPosition + headerHeight + scrollTriggerEdgeMargin) {
      scrollTargetPos = calculatedCursorPosition - headerHeight - ((windowHeight-headerHeight)/3);
      if (scrollTargetPos < 0) {
        scrollTargetPos = 0;
      }
    } else if(calculatedCursorPosition > scrollPosition + scrollTriggerEdgeMargin + windowHeight - headerHeight) {
      scrollTargetPos = calculatedCursorPosition - headerHeight - ((windowHeight-headerHeight)*2/3);

      if (scrollTargetPos > documentHeight) {
        scrollTargetPos = documentHeight;
      }
    }
    angular.element('body').scrollTo(scrollTargetPos, {axis: 'y', interrupt: true, duration:200});
  };

  var setEditorHeight = function(id, height) {
    angular.element('#' + id).height(height.toString() + 'px');
  };

  $scope.getEditorValue = function() {
    return $scope.editor.getValue();
  };

  $scope.getProgress = function() {
    return ($scope.currentProgress) ? $scope.currentProgress : 0;
  };

  $scope.getExecutionTime = function() {
    var pdata = $scope.paragraph;
    var timeMs = Date.parse(pdata.dateFinished) - Date.parse(pdata.dateStarted);
    if (isNaN(timeMs) || timeMs < 0) {
      if ($scope.isResultOutdated()){
        return 'outdated';
      }
      return '';
    }
    var desc = 'Took ' + (timeMs/1000) + ' seconds.';
    if ($scope.isResultOutdated()){
      desc += ' (outdated)';
    }
    return desc;
  };

  $scope.isResultOutdated = function() {
    var pdata = $scope.paragraph;
    if (pdata.dateUpdated !==undefined && Date.parse(pdata.dateUpdated) > Date.parse(pdata.dateStarted)){
      return true;
    }
    return false;
  };

  $scope.$on('updateProgress', function(event, data) {
    if (data.id === $scope.paragraph.id) {
      $scope.currentProgress = data.progress;
    }
  });

  $scope.$on('focusParagraph', function(event, paragraphId, cursorPos) {
    if ($scope.paragraph.id === paragraphId) {
      // focus editor
      $scope.editor.focus();

      // move cursor to the first row (or the last row)
      var row;
      if (cursorPos >= 0) {
        row = cursorPos;
        var column = 0;
        $scope.editor.gotoLine(row, 0);
      } else {
        row = $scope.editor.session.getLength() - 1;
        $scope.editor.gotoLine(row + 1, 0);
      }

      $scope.scrollToCursor($scope.paragraph.id, 0);
    }
  });

  $scope.$on('runParagraph', function(event) {
    $scope.runParagraph($scope.editor.getValue());
  });

  $scope.$on('openEditor', function(event) {
    $scope.openEditor();
  });

  $scope.$on('closeEditor', function(event) {
    $scope.closeEditor();
  });

  $scope.$on('openTable', function(event) {
    $scope.openTable();
  });

  $scope.$on('closeTable', function(event) {
    $scope.closeTable();
  });


  $scope.getResultType = function(paragraph) {
    var pdata = (paragraph) ? paragraph : $scope.paragraph;
    if (pdata.result && pdata.result.type) {
      return pdata.result.type;
    } else {
      return 'TEXT';
    }
  };

  $scope.getBase64ImageSrc = function(base64Data) {
    return 'data:image/png;base64,'+base64Data;
  };

  $scope.getGraphMode = function(paragraph) {
    var pdata = (paragraph) ? paragraph : $scope.paragraph;
    if (pdata.config.graph && pdata.config.graph.mode) {
      return pdata.config.graph.mode;
    } else {
      return 'table';
    }
  };

  $scope.loadTableData = function(result) {
    if (!result) {
      return;
    }
    if (result.type === 'TABLE') {
      var columnNames = [];
      var rows = [];
      var array = [];
      var textRows = result.msg.split('\n');
      result.comment = '';
      var comment = false;

      for (var i = 0; i < textRows.length; i++) {
        var textRow = textRows[i];
        if (comment) {
          result.comment += textRow;
          continue;
        }

        if (textRow === '') {
          if (rows.length>0) {
            comment = true;
          }
          continue;
        }
        var textCols = textRow.split('\t');
        var cols = [];
        var cols2 = [];
        for (var j = 0; j < textCols.length; j++) {
          var col = textCols[j];
          if (i === 0) {
            columnNames.push({name:col, index:j, aggr:'sum'});
          } else {
            cols.push(col);
            cols2.push({key: (columnNames[i]) ? columnNames[i].name: undefined, value: col});
          }
        }
        if (i !== 0) {
          rows.push(cols);
          array.push(cols2);
        }
      }
      result.msgTable = array;
      result.columnNames = columnNames;
      result.rows = rows;
    }
  };

  $scope.setGraphMode = function(type, emit, refresh) {
    if (emit) {
      setNewMode(type);
    } else {
      clearUnknownColsFromGraphOption();
      // set graph height
      var height = $scope.paragraph.config.graph.height;
      $('#p'+$scope.paragraph.id+'_graph').height(height);

      if (!type || type === 'table') {
        setTable($scope.paragraph.result, refresh);
      }
      else {
        setD3Chart(type, $scope.paragraph.result, refresh);
      }
    }
  };

  var setNewMode = function(newMode) {
    var newConfig = angular.copy($scope.paragraph.config);
    var newParams = angular.copy($scope.paragraph.settings.params);

    // graph options
    newConfig.graph.mode = newMode;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  var commitParagraph = function(title, text, config, params) {
    websocketMsgSrv.commitParagraph($scope.paragraph.id, title, text, config, params);
  };

  var setTable = function(type, data, refresh) {
    var getTableContentFormat = function(d) {
      if (isNaN(d)) {
        if (d.length>'%html'.length && '%html ' === d.substring(0, '%html '.length)) {
          return 'html';
        } else {
          return '';
        }
      } else {
        return '';
      }
    };

    var formatTableContent = function(d) {
      if (isNaN(d)) {
        var f = getTableContentFormat(d);
        if (f !== '') {
          return d.substring(f.length+2);
        } else {
          return d;
        }
      } else {
        var dStr = d.toString();
        var splitted = dStr.split('.');
        var formatted = splitted[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        if (splitted.length>1) {
          formatted+= '.'+splitted[1];
        }
        return formatted;
      }
    };


    var renderTable = function() {
      var html = '';
      html += '<table class="table table-hover table-condensed">';
      html += '  <thead>';
      html += '    <tr style="background-color: #F6F6F6; font-weight: bold;">';
      for (var c in $scope.paragraph.result.columnNames) {
        html += '<th>'+$scope.paragraph.result.columnNames[c].name+'</th>';
      }
      html += '    </tr>';
      html += '  </thead>';

      for (var r in $scope.paragraph.result.msgTable) {
        var row = $scope.paragraph.result.msgTable[r];
        html += '    <tr>';
        for (var index in row) {
          var v = row[index].value;
          if (getTableContentFormat(v) !== 'html') {
            v = v.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
              return '&#'+i.charCodeAt(0)+';';
            });
          }
          html += '      <td>'+formatTableContent(v)+'</td>';
        }
        html += '    </tr>';
      }

      html += '</table>';

      $('#p' + $scope.paragraph.id + '_table').html(html);
      $('#p' + $scope.paragraph.id + '_table').perfectScrollbar();

      // set table height
      var height = $scope.paragraph.config.graph.height;
      $('#p'+$scope.paragraph.id+'_table').height(height);
    };

    var retryRenderer = function() {
      if ($('#p'+$scope.paragraph.id+'_table').length) {
        try {
          renderTable();
        } catch(err) {
          console.log('Chart drawing error %o', err);
        }
      } else {
        $timeout(retryRenderer,10);
      }
    };
    $timeout(retryRenderer);

  };

  var setD3Chart = function(type, data, refresh) {
    if (!$scope.chart[type]) {
      var chart = nv.models[type]();
      $scope.chart[type] = chart;
    }

    var d3g = [];
    var xLabels;
    var yLabels;

    if (type === 'scatterChart') {
      var scatterData = setScatterChart(data, refresh);

      xLabels = scatterData.xLabels;
      yLabels = scatterData.yLabels;
      d3g = scatterData.d3g;

      $scope.chart[type].xAxis.tickFormat(function(d) {
        if (xLabels[d] && (isNaN(parseFloat(xLabels[d])) || !isFinite(xLabels[d]))) {
          return xLabels[d];
        } else {
          return d;
        }
      });

      $scope.chart[type].yAxis.tickFormat(function(d) {
        if (yLabels[d] && (isNaN(parseFloat(yLabels[d])) || !isFinite(yLabels[d]))) {
          return yLabels[d];
        } else {
          return d;
        }
      });

      // configure how the tooltip looks.
      $scope.chart[type].tooltipContent(function(key, x, y, data) {
        var tooltipContent = '<h3>' + key + '</h3>';
        if ($scope.paragraph.config.graph.scatter.size &&
            $scope.isValidSizeOption($scope.paragraph.config.graph.scatter, $scope.paragraph.result.rows)) {
          tooltipContent += '<p>' + data.point.size + '</p>';
        }

        return tooltipContent;
      });

      $scope.chart[type].showDistX(true)
        .showDistY(true)
      //handle the problem of tooltip not showing when muliple points have same value.
        .scatter.useVoronoi(false);
    } else {
      var p = pivot(data);
      if (type === 'pieChart') {
        var d = pivotDataToD3ChartFormat(p, true).d3g;

        $scope.chart[type].x(function(d) { return d.label;})
          .y(function(d) { return d.value;});

        if ( d.length > 0 ) {
          for ( var i=0; i<d[0].values.length ; i++) {
            var e = d[0].values[i];
            d3g.push({
              label : e.x,
              value : e.y
            });
          }
        }
      } else if (type === 'multiBarChart') {
        d3g = pivotDataToD3ChartFormat(p, true, false, type).d3g;
        $scope.chart[type].yAxis.axisLabelDistance(50);
      } else if (type === 'lineChart' || type === 'stackedAreaChart' || type === 'lineWithFocusChart') {
        var pivotdata = pivotDataToD3ChartFormat(p, false, true);
        xLabels = pivotdata.xLabels;
        d3g = pivotdata.d3g;
        $scope.chart[type].xAxis.tickFormat(function(d) {
          if (xLabels[d] && (isNaN(parseFloat(xLabels[d])) || !isFinite(xLabels[d]))) { // to handle string type xlabel
            return xLabels[d];
          } else {
            return d;
          }
        });
        $scope.chart[type].yAxis.axisLabelDistance(50);
        if ($scope.chart[type].useInteractiveGuideline) { // lineWithFocusChart hasn't got useInteractiveGuideline
          $scope.chart[type].useInteractiveGuideline(true); // for better UX and performance issue. (https://github.com/novus/nvd3/issues/691)
        }
        if($scope.paragraph.config.graph.forceY) {
          $scope.chart[type].forceY([0]); // force y-axis minimum to 0 for line chart.
        } else {
          $scope.chart[type].forceY([]);
        }
      }
    }

    var renderChart = function() {
      if (!refresh) {
        // TODO force destroy previous chart
      }

      var height = $scope.paragraph.config.graph.height;

      var animationDuration = 300;
      var numberOfDataThreshold = 150;
      // turn off animation when dataset is too large. (for performance issue)
      // still, since dataset is large, the chart content sequentially appears like animated.
      try {
        if (d3g[0].values.length > numberOfDataThreshold) {
          animationDuration = 0;
        }
      } catch(ignoreErr) {
      }

      var chartEl = d3.select('#p'+$scope.paragraph.id+'_'+type+' svg')
      .attr('height', $scope.paragraph.config.graph.height)
      .datum(d3g)
      .transition()
      .duration(animationDuration)
      .call($scope.chart[type]);
      d3.select('#p'+$scope.paragraph.id+'_'+type+' svg').style.height = height+'px';
      nv.utils.windowResize($scope.chart[type].update);
    };

    var retryRenderer = function() {
      if ($('#p'+$scope.paragraph.id+'_'+type+' svg').length !== 0) {
        try {
          renderChart();
        } catch(err) {
          console.log('Chart drawing error %o', err);
        }
      } else {
        $timeout(retryRenderer,10);
      }
    };
    $timeout(retryRenderer);
  };

  $scope.isGraphMode = function(graphName) {
    if ($scope.getResultType() === 'TABLE' && $scope.getGraphMode()===graphName) {
      return true;
    } else {
      return false;
    }
  };


  $scope.onGraphOptionChange = function() {
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeGraphOptionKeys = function(idx) {
    $scope.paragraph.config.graph.keys.splice(idx, 1);
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeGraphOptionValues = function(idx) {
    $scope.paragraph.config.graph.values.splice(idx, 1);
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeGraphOptionGroups = function(idx) {
    $scope.paragraph.config.graph.groups.splice(idx, 1);
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.setGraphOptionValueAggr = function(idx, aggr) {
    $scope.paragraph.config.graph.values[idx].aggr = aggr;
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeScatterOptionXaxis = function(idx) {
    $scope.paragraph.config.graph.scatter.xAxis = null;
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeScatterOptionYaxis = function(idx) {
    $scope.paragraph.config.graph.scatter.yAxis = null;
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeScatterOptionGroup = function(idx) {
    $scope.paragraph.config.graph.scatter.group = null;
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  $scope.removeScatterOptionSize = function(idx) {
    $scope.paragraph.config.graph.scatter.size = null;
    clearUnknownColsFromGraphOption();
    $scope.setGraphMode($scope.paragraph.config.graph.mode, true, false);
  };

  /* Clear unknown columns from graph option */
  var clearUnknownColsFromGraphOption = function() {
    var unique = function(list) {
      for (var i = 0; i<list.length; i++) {
        for (var j=i+1; j<list.length; j++) {
          if (angular.equals(list[i], list[j])) {
            list.splice(j, 1);
          }
        }
      }
    };

    var removeUnknown = function(list) {
      for (var i = 0; i<list.length; i++) {
        // remove non existing column
        var found = false;
        for (var j=0; j<$scope.paragraph.result.columnNames.length; j++) {
          var a = list[i];
          var b = $scope.paragraph.result.columnNames[j];
          if (a.index === b.index && a.name === b.name) {
            found = true;
            break;
          }
        }
        if (!found) {
          list.splice(i, 1);
        }
      }
    };

    var removeUnknownFromScatterSetting = function(fields) {
      for (var f in fields) {
        if (fields[f]) {
          var found = false;
          for (var i = 0; i < $scope.paragraph.result.columnNames.length; i++) {
            var a = fields[f];
            var b = $scope.paragraph.result.columnNames[i];
            if (a.index === b.index && a.name === b.name) {
              found = true;
              break;
            }
          }
          if (!found) {
            fields[f] = null;
          }
        }
      }
    };

    unique($scope.paragraph.config.graph.keys);
    removeUnknown($scope.paragraph.config.graph.keys);

    removeUnknown($scope.paragraph.config.graph.values);

    unique($scope.paragraph.config.graph.groups);
    removeUnknown($scope.paragraph.config.graph.groups);

    removeUnknownFromScatterSetting($scope.paragraph.config.graph.scatter);
  };

  /* select default key and value if there're none selected */
  var selectDefaultColsForGraphOption = function() {
    if ($scope.paragraph.config.graph.keys.length === 0 && $scope.paragraph.result.columnNames.length > 0) {
      $scope.paragraph.config.graph.keys.push($scope.paragraph.result.columnNames[0]);
    }

    if ($scope.paragraph.config.graph.values.length === 0 && $scope.paragraph.result.columnNames.length > 1) {
      $scope.paragraph.config.graph.values.push($scope.paragraph.result.columnNames[1]);
    }

    if (!$scope.paragraph.config.graph.scatter.xAxis && !$scope.paragraph.config.graph.scatter.yAxis) {
      if ($scope.paragraph.result.columnNames.length > 1) {
        $scope.paragraph.config.graph.scatter.xAxis = $scope.paragraph.result.columnNames[0];
        $scope.paragraph.config.graph.scatter.yAxis = $scope.paragraph.result.columnNames[1];
      } else if ($scope.paragraph.result.columnNames.length === 1) {
        $scope.paragraph.config.graph.scatter.xAxis = $scope.paragraph.result.columnNames[0];
      }
    }
  };

  var pivot = function(data) {
    var keys = $scope.paragraph.config.graph.keys;
    var groups = $scope.paragraph.config.graph.groups;
    var values = $scope.paragraph.config.graph.values;

    var aggrFunc = {
      sum : function(a,b) {
        var varA = (a !== undefined) ? (isNaN(a) ? 1 : parseFloat(a)) : 0;
        var varB = (b !== undefined) ? (isNaN(b) ? 1 : parseFloat(b)) : 0;
        return varA+varB;
      },
      count : function(a,b) {
        var varA = (a !== undefined) ? parseInt(a) : 0;
        var varB = (b !== undefined) ? 1 : 0;
        return varA+varB;
      },
      min : function(a,b) {
        var varA = (a !== undefined) ? (isNaN(a) ? 1 : parseFloat(a)) : 0;
        var varB = (b !== undefined) ? (isNaN(b) ? 1 : parseFloat(b)) : 0;
        return Math.min(varA,varB);
      },
      max : function(a,b) {
        var varA = (a !== undefined) ? (isNaN(a) ? 1 : parseFloat(a)) : 0;
        var varB = (b !== undefined) ? (isNaN(b) ? 1 : parseFloat(b)) : 0;
        return Math.max(varA,varB);
      },
      avg : function(a,b,c) {
        var varA = (a !== undefined) ? (isNaN(a) ? 1 : parseFloat(a)) : 0;
        var varB = (b !== undefined) ? (isNaN(b) ? 1 : parseFloat(b)) : 0;
        return varA+varB;
      }
    };

    var aggrFuncDiv = {
      sum : false,
      count : false,
      min : false,
      max : false,
      avg : true
    };

    var schema = {};
    var rows = {};

    for (var i=0; i < data.rows.length; i++) {
      var row = data.rows[i];
      var newRow = {};
      var s = schema;
      var p = rows;

      for (var k=0; k < keys.length; k++) {
        var key = keys[k];

        // add key to schema
        if (!s[key.name]) {
          s[key.name] = {
            order : k,
            index : key.index,
            type : 'key',
            children : {}
          };
        }
        s = s[key.name].children;

        // add key to row
        var keyKey = row[key.index];
        if (!p[keyKey]) {
          p[keyKey] = {};
        }
        p = p[keyKey];
      }

      for (var g=0; g < groups.length; g++) {
        var group = groups[g];
        var groupKey = row[group.index];

        // add group to schema
        if (!s[groupKey]) {
          s[groupKey] = {
            order : g,
            index : group.index,
            type : 'group',
            children : {}
          };
        }
        s = s[groupKey].children;

        // add key to row
        if (!p[groupKey]) {
          p[groupKey] = {};
        }
        p = p[groupKey];
      }

      for (var v=0; v < values.length; v++) {
        var value = values[v];
        var valueKey = value.name+'('+value.aggr+')';

        // add value to schema
        if (!s[valueKey]) {
          s[valueKey] = {
            type : 'value',
            order : v,
            index : value.index
          };
        }

        // add value to row
        if (!p[valueKey]) {
          p[valueKey] = {
            value : (value.aggr !== 'count') ? row[value.index] : 1,
            count: 1
          };
        } else {
          p[valueKey] = {
            value : aggrFunc[value.aggr](p[valueKey].value, row[value.index], p[valueKey].count+1),
            count : (aggrFuncDiv[value.aggr]) ?  p[valueKey].count+1 : p[valueKey].count
          };
        }
      }
    }

    //console.log("schema=%o, rows=%o", schema, rows);

    return {
      schema : schema,
      rows : rows
    };
  };

  var pivotDataToD3ChartFormat = function(data, allowTextXAxis, fillMissingValues, chartType) {
    // construct d3 data
    var d3g = [];

    var schema = data.schema;
    var rows = data.rows;
    var values = $scope.paragraph.config.graph.values;

    var concat = function(o, n) {
      if (!o) {
        return n;
      } else {
        return o+'.'+n;
      }
    };

    var getSchemaUnderKey = function(key, s) {
      for (var c in key.children) {
        s[c] = {};
        getSchemaUnderKey(key.children[c], s[c]);
      }
    };

    var traverse = function(sKey, s, rKey, r, func, rowName, rowValue, colName) {
      //console.log("TRAVERSE sKey=%o, s=%o, rKey=%o, r=%o, rowName=%o, rowValue=%o, colName=%o", sKey, s, rKey, r, rowName, rowValue, colName);

      if (s.type==='key') {
        rowName = concat(rowName, sKey);
        rowValue = concat(rowValue, rKey);
      } else if (s.type==='group') {
        colName = concat(colName, rKey);
      } else if (s.type==='value' && sKey===rKey || valueOnly) {
        colName = concat(colName, rKey);
        func(rowName, rowValue, colName, r);
      }

      for (var c in s.children) {
        if (fillMissingValues && s.children[c].type === 'group' && r[c] === undefined) {
          var cs = {};
          getSchemaUnderKey(s.children[c], cs);
          traverse(c, s.children[c], c, cs, func, rowName, rowValue, colName);
          continue;
        }

        for (var j in r) {
          if (s.children[c].type === 'key' || c === j) {
            traverse(c, s.children[c], j, r[j], func, rowName, rowValue, colName);
          }
        }
      }
    };

    var keys = $scope.paragraph.config.graph.keys;
    var groups = $scope.paragraph.config.graph.groups;
    values = $scope.paragraph.config.graph.values;
    var valueOnly = (keys.length === 0 && groups.length === 0 && values.length > 0);
    var noKey = (keys.length === 0);
    var isMultiBarChart = (chartType === 'multiBarChart');

    var sKey = Object.keys(schema)[0];

    var rowNameIndex = {};
    var rowIdx = 0;
    var colNameIndex = {};
    var colIdx = 0;
    var rowIndexValue = {};

    for (var k in rows) {
      traverse(sKey, schema[sKey], k, rows[k], function(rowName, rowValue, colName, value) {
        //console.log("RowName=%o, row=%o, col=%o, value=%o", rowName, rowValue, colName, value);
        if (rowNameIndex[rowValue] === undefined) {
          rowIndexValue[rowIdx] = rowValue;
          rowNameIndex[rowValue] = rowIdx++;
        }

        if (colNameIndex[colName] === undefined) {
          colNameIndex[colName] = colIdx++;
        }
        var i = colNameIndex[colName];
        if (noKey && isMultiBarChart) {
          i = 0;
        }

        if (!d3g[i]) {
          d3g[i] = {
            values : [],
            key : (noKey && isMultiBarChart) ? 'values' : colName
          };
        }

        var xVar = isNaN(rowValue) ? ((allowTextXAxis) ? rowValue : rowNameIndex[rowValue]) : parseFloat(rowValue);
        var yVar = 0;
        if (xVar === undefined) { xVar = colName; }
        if (value !== undefined) {
          yVar = isNaN(value.value) ? 0 : parseFloat(value.value) / parseFloat(value.count);
        }
        d3g[i].values.push({
          x : xVar,
          y : yVar
        });
      });
    }

    // clear aggregation name, if possible
    var namesWithoutAggr = {};
    var colName;
    var withoutAggr;
    // TODO - This part could use som refactoring - Weird if/else with similar actions and variable names
    for (colName in colNameIndex) {
      withoutAggr = colName.substring(0, colName.lastIndexOf('('));
      if (!namesWithoutAggr[withoutAggr]) {
        namesWithoutAggr[withoutAggr] = 1;
      } else {
        namesWithoutAggr[withoutAggr]++;
      }
    }

    if (valueOnly) {
      for (var valueIndex = 0; valueIndex < d3g[0].values.length; valueIndex++) {
        colName = d3g[0].values[valueIndex].x;
        if (!colName) {
          continue;
        }

        withoutAggr = colName.substring(0, colName.lastIndexOf('('));
        if (namesWithoutAggr[withoutAggr] <= 1 ) {
          d3g[0].values[valueIndex].x = withoutAggr;
        }
      }
    } else {
      for (var d3gIndex = 0; d3gIndex < d3g.length; d3gIndex++) {
        colName = d3g[d3gIndex].key;
        withoutAggr = colName.substring(0, colName.lastIndexOf('('));
        if (namesWithoutAggr[withoutAggr] <= 1 ) {
          d3g[d3gIndex].key = withoutAggr;
        }
      }

      // use group name instead of group.value as a column name, if there're only one group and one value selected.
      if (groups.length === 1 && values.length === 1) {
        for (d3gIndex = 0; d3gIndex < d3g.length; d3gIndex++) {
          colName = d3g[d3gIndex].key;
          colName = colName.split('.')[0];
          d3g[d3gIndex].key = colName;
        }
      }

    }

    return {
      xLabels : rowIndexValue,
      d3g : d3g
    };
  };


  var setDiscreteScatterData = function(data) {
    var xAxis = $scope.paragraph.config.graph.scatter.xAxis;
    var yAxis = $scope.paragraph.config.graph.scatter.yAxis;
    var group = $scope.paragraph.config.graph.scatter.group;

    var xValue;
    var yValue;
    var grp;

    var rows = {};

    for (var i = 0; i < data.rows.length; i++) {
      var row = data.rows[i];
      if (xAxis) {
        xValue = row[xAxis.index];
      }
      if (yAxis) {
        yValue = row[yAxis.index];
      }
      if (group) {
        grp = row[group.index];
      }

      var key = xValue + ',' + yValue +  ',' + grp;

      if(!rows[key]) {
        rows[key] = {
          x : xValue,
          y : yValue,
          group : grp,
          size : 1
        };
      } else {
        rows[key].size++;
      }
    }

    // change object into array
    var newRows = [];
    for(var r in rows){
      var newRow = [];
      if (xAxis) { newRow[xAxis.index] = rows[r].x; }
      if (yAxis) { newRow[yAxis.index] = rows[r].y; }
      if (group) { newRow[group.index] = rows[r].group; }
      newRow[data.rows[0].length] = rows[r].size;
      newRows.push(newRow);
    }
    return newRows;
  };

  var setScatterChart = function(data, refresh) {
    var xAxis = $scope.paragraph.config.graph.scatter.xAxis;
    var yAxis = $scope.paragraph.config.graph.scatter.yAxis;
    var group = $scope.paragraph.config.graph.scatter.group;
    var size = $scope.paragraph.config.graph.scatter.size;

    var xValues = [];
    var yValues = [];
    var rows = {};
    var d3g = [];

    var rowNameIndex = {};
    var colNameIndex = {};
    var grpNameIndex = {};
    var rowIndexValue = {};
    var colIndexValue = {};
    var grpIndexValue = {};
    var rowIdx = 0;
    var colIdx = 0;
    var grpIdx = 0;
    var grpName = '';

    var xValue;
    var yValue;
    var row;

    if (!xAxis && !yAxis) {
      return {
        d3g : []
      };
    }

    for (var i = 0; i < data.rows.length; i++) {
      row = data.rows[i];
      if (xAxis) {
        xValue = row[xAxis.index];
        xValues[i] = xValue;
      }
      if (yAxis) {
        yValue = row[yAxis.index];
        yValues[i] = yValue;
      }
    }

    var isAllDiscrete = ((xAxis && yAxis && isDiscrete(xValues) && isDiscrete(yValues)) ||
                         (!xAxis && isDiscrete(yValues)) ||
                         (!yAxis && isDiscrete(xValues)));

    if (isAllDiscrete) {
      rows = setDiscreteScatterData(data);
    } else {
      rows = data.rows;
    }

    if (!group && isAllDiscrete) {
      grpName = 'count';
    } else if (!group && !size) {
      if (xAxis && yAxis) {
        grpName = '(' + xAxis.name + ', ' + yAxis.name + ')';
      } else if (xAxis && !yAxis) {
        grpName = xAxis.name;
      } else if (!xAxis && yAxis) {
        grpName = yAxis.name;
      }
    } else if (!group && size) {
      grpName = size.name;
    }

    for (i = 0; i < rows.length; i++) {
      row = rows[i];
      if (xAxis) {
        xValue = row[xAxis.index];
      }
      if (yAxis) {
        yValue = row[yAxis.index];
      }
      if (group) {
        grpName = row[group.index];
      }
      var sz = (isAllDiscrete) ? row[row.length-1] : ((size) ? row[size.index] : 1);

      if (grpNameIndex[grpName] === undefined) {
        grpIndexValue[grpIdx] = grpName;
        grpNameIndex[grpName] = grpIdx++;
      }

      if (xAxis && rowNameIndex[xValue] === undefined) {
        rowIndexValue[rowIdx] = xValue;
        rowNameIndex[xValue] = rowIdx++;
      }

      if (yAxis && colNameIndex[yValue] === undefined) {
        colIndexValue[colIdx] = yValue;
        colNameIndex[yValue] = colIdx++;
      }

      if (!d3g[grpNameIndex[grpName]]) {
        d3g[grpNameIndex[grpName]] = {
          key : grpName,
          values : []
        };
      }

      d3g[grpNameIndex[grpName]].values.push({
        x : xAxis ? (isNaN(xValue) ? rowNameIndex[xValue] : parseFloat(xValue)) : 0,
        y : yAxis ? (isNaN(yValue) ? colNameIndex[yValue] : parseFloat(yValue)) : 0,
        size : isNaN(parseFloat(sz))? 1 : parseFloat(sz)
      });
    }

    return {
      xLabels : rowIndexValue,
      yLabels : colIndexValue,
      d3g : d3g
    };
  };

  var isDiscrete = function(field) {
    var getUnique = function(f) {
      var uniqObj = {};
      var uniqArr = [];
      var j = 0;
      for (var i = 0; i < f.length; i++) {
        var item = f[i];
        if(uniqObj[item] !== 1) {
          uniqObj[item] = 1;
          uniqArr[j++] = item;
        }
      }
      return uniqArr;
    };

    for (var i = 0; i < field.length; i++) {
      if(isNaN(parseFloat(field[i])) &&
         (typeof field[i] === 'string' || field[i] instanceof String)) {
        return true;
      }
    }

    var threshold = 0.05;
    var unique = getUnique(field);
    if (unique.length/field.length < threshold) {
      return true;
    } else {
      return false;
    }
  };

  $scope.isValidSizeOption = function (options, rows) {
    var xValues = [];
    var yValues = [];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var size = row[options.size.index];

      //check if the field is numeric
      if (isNaN(parseFloat(size)) || !isFinite(size)) {
        return false;
      }

      if (options.xAxis) {
        var x = row[options.xAxis.index];
        xValues[i] = x;
      }
      if (options.yAxis) {
        var y = row[options.yAxis.index];
        yValues[i] = y;
      }
    }

    //check if all existing fields are discrete
    var isAllDiscrete = ((options.xAxis && options.yAxis && isDiscrete(xValues) && isDiscrete(yValues)) ||
                         (!options.xAxis && isDiscrete(yValues)) ||
                         (!options.yAxis && isDiscrete(xValues)));

    if (isAllDiscrete) {
      return false;
    }

    return true;
  };

  $scope.setGraphHeight = function() {
    var height = $('#p'+$scope.paragraph.id+'_graph').height();

    var newParams = angular.copy($scope.paragraph.settings.params);
    var newConfig = angular.copy($scope.paragraph.config);

    newConfig.graph.height = height;

    commitParagraph($scope.paragraph.title, $scope.paragraph.text, newConfig, newParams);
  };

  /** Utility function */
  if (typeof String.prototype.startsWith !== 'function') {
    String.prototype.startsWith = function(str) {
      return this.slice(0, str.length) === str;
    };
  }

  $scope.goToSingleParagraph = function () {
    var noteId = $route.current.pathParams.noteId;
    var redirectToUrl = location.protocol + '//' + location.host + location.pathname + '#/notebook/' + noteId + '/paragraph/' + $scope.paragraph.id+'?asIframe';
    $window.open(redirectToUrl);
  };
}]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').service('arrayOrderingSrv', function() {

  this.notebookListOrdering = function(note) {
    return (note.name ? note.name : 'Note ' + note.id);
  };

});

/* global $:false */
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

angular.module('zeppelinWebApp').controller('NavCtrl', ["$scope", "$rootScope", "$routeParams", "notebookListDataFactory", "websocketMsgSrv", "arrayOrderingSrv", function($scope, $rootScope, $routeParams, notebookListDataFactory, websocketMsgSrv, arrayOrderingSrv) {
  /** Current list of notes (ids) */

  var vm = this;
  vm.notes = notebookListDataFactory;
  vm.connected = websocketMsgSrv.isConnected();
  vm.websocketMsgSrv = websocketMsgSrv;
  vm.arrayOrderingSrv = arrayOrderingSrv;
  
  $('#notebook-list').perfectScrollbar({suppressScrollX: true});
  
  $scope.$on('setNoteMenu', function(event, notes) {
    notebookListDataFactory.setNotes(notes);
  });

  $scope.$on('setConnectedStatus', function(event, param) {
    vm.connected = param;
  });

  function loadNotes() {
    websocketMsgSrv.getNotebookList();
  }

  function isActive(noteId) {
    return ($routeParams.noteId === noteId);
  }

  vm.loadNotes = loadNotes;
  vm.isActive = isActive;

  vm.loadNotes();

}]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').directive('ngEscape', function() {
  return function(scope, element, attrs) {
    element.bind('keydown keyup', function(event) {
      if (event.which === 27) {
        scope.$apply(function() {
          scope.$eval(attrs.ngEnter);
        });
        event.preventDefault();
      }
    });
  };
});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

angular.module('zeppelinWebApp').controller('NotenameCtrl', ["$scope", "$rootScope", "$routeParams", "websocketMsgSrv", function($scope, $rootScope, $routeParams, websocketMsgSrv) {
  var vm = this;
  vm.websocketMsgSrv = websocketMsgSrv;
  $scope.note = {};
  vm.createNote = function(){
  	  if(!vm.clone){
		  vm.websocketMsgSrv.createNotebook($scope.note.notename);
  	  }else{
	  	 var noteId = $routeParams.noteId;
  	  	 vm.websocketMsgSrv.cloneNotebook(noteId, $scope.note.notename);
  	  }
  };

  $scope.$on('setNoteContent', function(event, note) {
    if(note !== undefined) {
      window.location = '#/notebook/' + note.id;
      console.log(note);
    }
  });

  vm.preVisible = function(clone){
		var generatedName = vm.generateName();
		$scope.note.notename = 'Note ' + generatedName;
		vm.clone = clone;
		$scope.$apply();
  };
  vm.generateName = function () {
		var DICTIONARY = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B',
				'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'M', 'N', 'P', 'Q', 'R',
				'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];
		var randIndex, name = '';
		for (var i = 0; i < 9; i++) {
			randIndex = Math.floor(Math.random() * 32);
			name += DICTIONARY[randIndex];
		}
		return name;
	};
}]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp')
  .directive('popoverHtmlUnsafePopup', function() {
    return {
      restrict: 'EA',
      replace: true,
      scope: { title: '@', content: '@', placement: '@', animation: '&', isOpen: '&' },
      templateUrl: 'components/popover-html-unsafe/popover-html-unsafe-popup.html'
    };
  })

  .directive('popoverHtmlUnsafe', ['$tooltip', function($tooltip) {
    return $tooltip('popoverHtmlUnsafe', 'popover', 'click');
  }]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').directive('ngEnter', function() {
  return function(scope, element, attrs) {
    element.bind('keydown keypress', function(event) {
      if (event.which === 13) {
        scope.$apply(function() {
          scope.$eval(attrs.ngEnter);
        });
        event.preventDefault();
      }
    });
  };
});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').directive('dropdownInput', function () {
    return {
        restrict: 'A',
        link: function (scope, element) {
            element.bind('click', function (event) {
                event.stopPropagation();
            });
        }
    };
});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').directive('resizable', function () {
    var resizableConfig = {
        autoHide: true,
        handles: 'se',
        helper: 'resizable-helper',
        minHeight:100,
        grid: [10000, 10]  // allow only vertical
    };

    return {
        restrict: 'A',
        scope: {
            callback: '&onResize'
        },
        link: function postLink(scope, elem, attrs) {
            attrs.$observe('allowresize', function(isAllowed) {
                if (isAllowed === 'true') {
                    elem.resizable(resizableConfig);
                    elem.on('resizestop', function () {
                        if (scope.callback) { scope.callback(); }
                    });
                }
            });
        }
    };
});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').directive('modalvisible', function () {
    return {
        restrict: 'A',
        scope: {
	        	preVisibleCallback: '&previsiblecallback',
	        	postVisibleCallback: '&postvisiblecallback',
	        	targetinput: '@targetinput'
        	   },
        link: function(scope, elem, attrs) {
        	// Add some listeners
    		var previsibleMethod = scope.preVisibleCallback;
    		var postVisibleMethod = scope.postVisibleCallback;
    		elem.on('show.bs.modal',function(e) {
    			var relatedTgt = angular.element(e.relatedTarget);
    			var clone = relatedTgt.data('clone');
    			var cloneNote = clone ? true : false;
    			previsibleMethod()(cloneNote);
    		});
    		elem.on('shown.bs.modal', function(e) {
    			if(scope.targetinput) {
    			  angular.element(e.target).find('input#' + scope.targetinput ).select();
    			}
    			postVisibleMethod();
    		});
        }
    };
});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').service('websocketMsgSrv', ["$rootScope", "websocketEvents", function($rootScope, websocketEvents) {

  return {

    getHomeNotebook: function() {
      websocketEvents.sendNewEvent({op: 'GET_HOME_NOTE'});
    },

    createNotebook: function(noteName) {
      websocketEvents.sendNewEvent({op: 'NEW_NOTE',data: {name: noteName}});
    },

    deleteNotebook: function(noteId) {
      websocketEvents.sendNewEvent({op: 'DEL_NOTE', data: {id: noteId}});
    },

    cloneNotebook: function(noteIdToClone, newNoteName ) {
      websocketEvents.sendNewEvent({op: 'CLONE_NOTE', data: {id: noteIdToClone, name: newNoteName}});
    },
    getNotebookList: function() {
      websocketEvents.sendNewEvent({op: 'LIST_NOTES'});
    },

    getNotebook: function(noteId) {
      websocketEvents.sendNewEvent({op: 'GET_NOTE', data: {id: noteId}});
    },

    updateNotebook: function(noteId, noteName, noteConfig) {
      websocketEvents.sendNewEvent({op: 'NOTE_UPDATE', data: {id: noteId, name: noteName, config : noteConfig}});
    },

    moveParagraph: function(paragraphId, newIndex) {
      websocketEvents.sendNewEvent({ op: 'MOVE_PARAGRAPH', data : {id: paragraphId, index: newIndex}});
    },

    insertParagraph: function(newIndex) {
      websocketEvents.sendNewEvent({ op: 'INSERT_PARAGRAPH', data : {index: newIndex}});
    },

    updateAngularObject: function(noteId, name, value, interpreterGroupId) {
      websocketEvents.sendNewEvent({
        op: 'ANGULAR_OBJECT_UPDATED',
        data: {
          noteId: noteId,
          name: name,
          value: value,
          interpreterGroupId: interpreterGroupId
        }
      });
    },

    cancelParagraphRun: function(paragraphId) {
      websocketEvents.sendNewEvent({op: 'CANCEL_PARAGRAPH', data: {id: paragraphId}});
    },

    runParagraph: function(paragraphId, paragraphTitle, paragraphData, paragraphConfig, paragraphParams) {
      websocketEvents.sendNewEvent({
        op: 'RUN_PARAGRAPH',
        data: {
          id: paragraphId,
          title: paragraphTitle,
          paragraph: paragraphData,
          config: paragraphConfig,
          params: paragraphParams
        }
      });
    },

    removeParagraph: function(paragraphId) {
      websocketEvents.sendNewEvent({op: 'PARAGRAPH_REMOVE', data: {id: paragraphId}});
    },

    clearParagraphOutput: function(paragraphId) {
      websocketEvents.sendNewEvent({op: 'PARAGRAPH_CLEAR_OUTPUT', data: {id: paragraphId}});
    },

    completion: function(paragraphId, buf, cursor) {
      websocketEvents.sendNewEvent({
        op : 'COMPLETION',
        data : {
          id : paragraphId,
          buf : buf,
          cursor : cursor
        }
      });
    },

    commitParagraph: function(paragraphId, paragraphTitle, paragraphData, paragraphConfig, paragraphParams) {
      websocketEvents.sendNewEvent({
        op: 'COMMIT_PARAGRAPH',
        data: {
          id: paragraphId,
          title : paragraphTitle,
          paragraph: paragraphData,
          config: paragraphConfig,
          params: paragraphParams
        }
      });
    },

    isConnected: function(){
      return websocketEvents.isConnected();
    }

  };

}]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').factory('websocketEvents', ["$rootScope", "$websocket", "baseUrlSrv", function($rootScope, $websocket, baseUrlSrv) {
  var websocketCalls = {};

  websocketCalls.ws = $websocket(baseUrlSrv.getWebsocketUrl());
  websocketCalls.ws.reconnectIfNotNormalClose = true;

  websocketCalls.ws.onOpen(function() {
    console.log('Websocket created');
    $rootScope.$broadcast('setConnectedStatus', true);
    setInterval(function(){
      websocketCalls.sendNewEvent({op: 'PING'});
    }, 10000);
  });

  websocketCalls.sendNewEvent = function(data) {
    console.log('Send >> %o, %o', data.op, data);
    websocketCalls.ws.send(JSON.stringify(data));
  };

  websocketCalls.isConnected = function() {
    return (websocketCalls.ws.socket.readyState === 1);
  };

  websocketCalls.ws.onMessage(function(event) {
    var payload;
    if (event.data) {
      payload = angular.fromJson(event.data);
    }
    console.log('Receive << %o, %o', payload.op, payload);
    var op = payload.op;
    var data = payload.data;
    if (op === 'NOTE') {
      $rootScope.$broadcast('setNoteContent', data.note);
    } else if (op === 'NOTES_INFO') {
      $rootScope.$broadcast('setNoteMenu', data.notes);
    } else if (op === 'PARAGRAPH') {
      $rootScope.$broadcast('updateParagraph', data);
    } else if (op === 'PROGRESS') {
      $rootScope.$broadcast('updateProgress', data);
    } else if (op === 'COMPLETION_LIST') {
      $rootScope.$broadcast('completionList', data);
    } else if (op === 'ANGULAR_OBJECT_UPDATE') {
      $rootScope.$broadcast('angularObjectUpdate', data);
    } else if (op === 'ANGULAR_OBJECT_REMOVE') {
      $rootScope.$broadcast('angularObjectRemove', data);
    }
  });

  websocketCalls.ws.onError(function(event) {
    console.log('error message: ', event);
    $rootScope.$broadcast('setConnectedStatus', false);
  });

  websocketCalls.ws.onClose(function(event) {
    console.log('close message: ', event);
    $rootScope.$broadcast('setConnectedStatus', false);
  });

  return websocketCalls;
}]);

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').factory('notebookListDataFactory', function() {
  var notes = {};

  notes.list = [];

  notes.setNotes = function(notesList) {
    notes.list = angular.copy(notesList);
  };

  return notes;
});
/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').service('baseUrlSrv', function() {

  this.getPort = function() {
    var port = Number(location.port);
    if (!port) {
      port = 80;
      if (location.protocol === 'https:') {
        port = 443;
      }
    }
    //Exception for when running locally via grunt
    if (port === 3333 || port === 9000) {
      port = 8080;
    }
    return port;
  };

  this.getWebsocketUrl = function() {
    var wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return wsProtocol + '//' + location.hostname + ':' + this.getPort() + '/ws';
  };

  this.getRestApiBase = function() {
    return location.protocol + '//' + location.hostname + ':' + this.getPort() + skipTrailingSlash(location.pathname) + '/api';
  };

  var skipTrailingSlash = function(path) {
    return path.replace(/\/$/, '');
  };

});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').service('browserDetectService', function() {

  this.detectIE = function() {
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf('MSIE ');
    if (msie > 0) {
      // IE 10 or older => return version number
      return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
    }
    var trident = ua.indexOf('Trident/');
    if (trident > 0) {
      // IE 11 => return version number
      var rv = ua.indexOf('rv:');
      return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
    }
    var edge = ua.indexOf('Edge/');
    if (edge > 0) {
      // IE 12 (aka Edge) => return version number
      return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
    }
    // other browser
    return false;
  };

});

/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

angular.module('zeppelinWebApp').service('SaveAsService', ["browserDetectService", function(browserDetectService) {

  this.SaveAs = function(content, filename, extension) {
    if (browserDetectService.detectIE()) {
      angular.element('body').append('<iframe id="SaveAsId" style="display: none"></iframe>');
      var frameSaveAs = angular.element('body > iframe#SaveAsId')[0].contentWindow;
      frameSaveAs.document.open('text/json', 'replace');
      frameSaveAs.document.write(content);
      frameSaveAs.document.close();
      frameSaveAs.focus();
      var t1 = Date.now();
      frameSaveAs.document.execCommand('SaveAs', false, filename + '.' + extension);
      var t2 = Date.now();

      //This means, this version of IE dosen't support auto download of a file with extension provided in param
      //falling back to ".txt"
      if (t1 === t2) {
        frameSaveAs.document.execCommand('SaveAs', true, filename + '.txt');
      }
      angular.element('body > iframe#SaveAsId').remove();
    } else {
      content = 'data:image/svg;charset=utf-8,' + encodeURIComponent(content);
      angular.element('body').append('<a id="SaveAsId"></a>');
      var saveAsElement = angular.element('body > a#SaveAsId');
      saveAsElement.attr('href', content);
      saveAsElement.attr('download', filename + '.' + extension);
      saveAsElement.attr('target', '_blank');
      saveAsElement[0].click();
      saveAsElement.remove();
    }
  };

}]);
