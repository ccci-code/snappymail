(rl => {
	const client_id = rl.pluginSettingsGet('login-o365', 'client_id'),
		// https://learn.microsoft.com/en-us/entra/identity-platform/reply-url#query-parameter-support-in-redirect-uris	
		tenant_id = rl.pluginSettingsGet('login-o365', 'tenant_id'),
		scopes = rl.pluginSettingsGet('login-o365', 'scopes'),
		login = () => {
			document.location = 'https://login.microsoftonline.com/' + tenant_id + '/oauth2/v2.0/authorize?' + (new URLSearchParams({
				response_type: 'code',
				client_id: client_id,
				redirect_uri: document.location.href.replace(/\/$/, '') + '/?LoginO365',
				response_mode: 'query',
				scope: scopes,
				state: 'o365', // + rl.settings.app('token') + localStorage.getItem('smctoken')
				// Force authorize screen, so we always get a refresh_token
				access_type: 'offline',
				//prompt: 'consent'
			}));
		};

	if (client_id) {
		addEventListener('sm-user-login', e => {
			if (event.detail.get('Email').includes('@hotmail.com')) {
				e.preventDefault();
				login();
			}
		});

		addEventListener('rl-view-model', e => {
			if ('Login' === e.detail.viewModelTemplateID) {
				const
					container = e.detail.viewModelDom.querySelector('#plugin-Login-BottomControlGroup'),
					btn = Element.fromHTML('<button type="button">Outlook</button>'),
					div = Element.fromHTML('<div class="controls"></div>');
				btn.onclick = login;
				div.append(btn);
				container && container.append(div);
			}
		});
	}

})(window.rl);
