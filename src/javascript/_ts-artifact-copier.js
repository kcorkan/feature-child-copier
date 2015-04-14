Ext.define('Rally.technicalservices.data.ArtifactCopier',{
    logger: new Rally.technicalservices.Logger(),
    mixins: {
        observable: 'Ext.util.Observable',
    },
    constructor: function(config) {
        Ext.apply(this,config);
        this.callParent(arguments);
        this.addEvents('artifactscreated','copyerror');
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
        console.log('copy',modelType, copyFields);
        this._loadModel(modelType).then({
            scope: this,
            success: function(model){
                this._copyArtifact(model, record, copyFields).then({
                    scope: this,
                    success: function(result){
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
                                            alert('success');
                                           // this.fireEvent('artifactscreated',artifactsCreated);
                                        },
                                        failure: function(operation){
                                            alert('failed');
                                           // this.fireEvent('copyerror',operation);
                                        }
                                    });
                                }
                            });
                        }
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
                    success: function(result){
                        deferred.resolve(result);
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
            callback: function(record, operation, success) {
                console.log('artifact copied',record,success,operation);
                if (operation.wasSuccessful()){
                    deferred.resolve(record);
                } else {
                    deferred.resolve(operation.error.errors[0]);
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
        console.log('featurefields', fields);
        var record = Ext.create(model, fields);
        record.save({
            callback: function(record, operation, success) {
                console.log('artifact copied',record,success,operation);
                if (operation.wasSuccessful()){
                    deferred.resolve(record);
                } else {
                    deferred.resolve(operation.error.errors[0]);
                }
            }
        });
        return deferred;
    }
});

