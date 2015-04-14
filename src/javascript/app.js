Ext.define("feature-child-copier", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    featureFetchFields: ['Name','Project','Description','Owner','State','c_FeatureDeploymentType','c_FeatureType'],
    storyFetchFields: ['Name','Description','Release','Owner','Project','c_BCSwimlanes','c_BCStates'],

    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'message_box',tpl:'Hello, <tpl>{_refObjectName}</tpl>'},
        {xtype:'container',itemId:'display_box'},
        {xtype:'tsinfolink'}
    ],
    launch: function() {
        var me = this;
        this.down('#display_box').add({
            xtype: 'rallybutton',
            text: 'Select Feature...',
            scope: this,
            handler: this._launchArtifactSelector
        });
    },
    _launchArtifactSelector: function(){
        Ext.create('Rally.ui.dialog.ArtifactChooserDialog', {
            artifactTypes: ['portfolioitem/feature'],
            storeConfig: {fetch: this.featureFetchFields},
            autoShow: true,
            height: 250,
            title: 'Choose Feature To copy',
            listeners: {
                artifactchosen: this._onArtifactSelected,
                scope: this
            }
        });
    },
    _onArtifactSelected: function(selector, selectedRecord){
        this.logger.log('_onArtifactSelected', selectedRecord);
        var artifactCopier = Ext.create('Rally.technicalservices.data.ArtifactCopier',{
            scope: this,
            listeners: {
                artifactscreated: function(artifacts){
                    console.log('artifactcreated',artifacts);
                },
                copyerror: function(operation){
                    console.log('copyerror',operation)
                }
            }

        });
        artifactCopier.copy(selectedRecord,'PortfolioItem/Feature',this.featureFetchFields, this.storyFetchFields);
    }
});
