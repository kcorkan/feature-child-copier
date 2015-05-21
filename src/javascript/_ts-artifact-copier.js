Ext.define('Rally.technicalservices.data.ArtifactCopier',{
    logger: new Rally.technicalservices.Logger(),
    mixins: {
        observable: 'Ext.util.Observable'
    },
    constructor: function(config) {
        Ext.apply(this,config);
        this.callParent(arguments);
        this.addEvents('copyerror','artifactscreated');
    },
    _loadStories: function(record, storyCopyFields){
        var deferred = Ext.create('Deft.Deferred');

        record.getCollection('UserStories').load({
            scope: this,
            fetch: storyCopyFields,
            callback: function(stories,operation,success){
                deferred.resolve(stories);
            }
        });
        return deferred;
    },
    _loadModel: function(type){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: type,
            scope: this,
            success: function(model) {
                deferred.resolve(model);
            }
        });
        return deferred;
    },
    copy: function(record, modelType, copyFields, storyCopyFields){

        this._loadModel(modelType).then({
            scope: this,
            success: function(model){
                this._copyArtifact(model, record, copyFields).then({
                    scope: this,
                    success: function(result){
                        Rally.ui.notify.Notifier.showCreate({artifact: result});
                        if (typeof result == 'object'){
                            //Copy collection fields
                            this._loadStories(record, storyCopyFields).then({
                                scope: this,
                                success: function(stories){
                                    this.logger.log('_loadStories returned',stories);
                                    this._copyStories(stories, result, storyCopyFields).then({
                                        scope: this,
                                        success: function(results){

                                            var artifactsCreated = [];
                                            artifactsCreated.push(result);
                                            artifactsCreated.push(results);
                                            _.flatten(artifactsCreated);
                                            Rally.ui.notify.Notifier.show({message: 'Copy complete'});
                                        },
                                        failure: function(operation){

                                            Rally.ui.notify.Notifier.showError({message: 'Error Creating child artifacts: ' + operation.error.errors[0]});
                                        }
                                    });
                                },
                                failure: function(operation){
                                    Rally.ui.notify.Notifier.showError({message: 'Error loading stories: ' + operation.error.errors[0]});
                                }
                            });
                        }
                    },
                    failure: function(operation){
                        var msg = "-- Error(s) while copying " + record.get('FormattedID') + " --";
                        if (operation && operation.error){
                            _.each(operation.error.errors, function(err){
                                msg += '<br/>' + err;
                            });
                        }
                        Rally.ui.notify.Notifier.showError({message: msg}); // 'Error copying Artifact:  ' + operation.error.errors.join(',')});
                        //this.fireEvent('copyerror',msg);
                    }
                });
            }
        });
    },
    _copyStories: function(stories, newParent, fieldsToCopy){
        var deferred = Ext.create('Deft.Deferred');

        this._loadModel('HierarchicalRequirement').then({
            scope: this,
            success: function(storyModel){
                this._copyTemplateStories(storyModel, stories, newParent, fieldsToCopy).then({
                    scope: this,
                    success: function(results){
                        deferred.resolve(results);
                    },
                    failure: function(operation){
                        deferred.reject(operation);
                    }
                });
            }
        });

        return deferred;
    },
    _copyTemplateStories: function(storyModel, stories, parent, fieldsToCopy){
        var deferred = Ext.create('Deft.Deferred');
        var promises = [];
        Ext.each(stories, function(story){
            var fields = {};
            Ext.each(fieldsToCopy, function(f){
                fields[f] = story.get(f);
            });
            fields['PortfolioItem'] = parent.get('_ref');

            var fn = this._copyArtifactWithValues;
            promises.push(function(){
                var deferred = Ext.create('Deft.Deferred');
                fn(storyModel, story, fields).then({
                    scope: this,
                    success: function(result){
                        Rally.ui.notify.Notifier.showCreate({artifact: result});
                        deferred.resolve(result);
                    },
                    failure: function(operation){
                        deferred.reject(operation);
                    }
                });
                return deferred;
            });
        },this);

        Deft.Chain.sequence(promises,this).then({
            scope: this,
            success: function (results) {
                deferred.resolve(results);
            },
            failure: function(operation){
                deferred.reject(operation);
            }
        });
        return deferred;

    },
    _copyArtifactWithValues: function(model, record, fieldsWithValues){
        var deferred = Ext.create('Deft.Deferred');

        var record = Ext.create(model, fieldsWithValues);
        record.save({
            scope: this,
            callback: function(record, operation, success) {
                console.log('artifact copied',record,success,operation);
                if (success){
                    deferred.resolve(record);
                } else {
                    deferred.reject(operation);
                }
            }
        });
        return deferred;

    },
    _copyArtifact: function(model, record, fieldsToCopy){
        var deferred = Ext.create('Deft.Deferred');

        var fields = {};
        Ext.each(fieldsToCopy, function(f){
            fields[f] = record.get(f);
        });

        var record = Ext.create(model, fields);
        record.save({
            scope: this,
            callback: function(record, operation, success) {
                if (operation.wasSuccessful()){
                    deferred.resolve(record);
                } else {
                    deferred.reject(operation);
                }
            }
        });
        return deferred;
    }
});

