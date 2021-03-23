import ko from 'ko';

import {
	Notification
} from 'Common/Enums';

import { ClientSideKeyName } from 'Common/EnumsUser';

import { getNotification, reload as translatorReload, convertLangName } from 'Common/Translator';

import { LanguageStore } from 'Stores/Language';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewCenter } from 'Knoin/AbstractViews';

import { Settings, SettingsGet } from 'Common/Globals';

import { LanguagesPopupView } from 'View/Popup/Languages';

const
	LoginSignMeType = {
		DefaultOff: 0,
		DefaultOn: 1,
		Unused: 2
	},

	LoginSignMeTypeAsString = {
		DefaultOff: 'defaultoff',
		DefaultOn: 'defaulton',
		Unused: 'unused'
	};


class LoginUserView extends AbstractViewCenter {
	constructor() {
		super('User/Login', 'Login');

		this.hideSubmitButton = Settings.app('hideSubmitButton');

		this.addObservables({
			loadingDesc: SettingsGet('LoadingDescription'),

			email: SettingsGet('DevEmail'),
			password: SettingsGet('DevPassword'),
			signMe: false,
			additionalCode: '',

			emailError: false,
			passwordError: false,

			formHidden: false,

			submitRequest: false,
			submitError: '',
			submitErrorAddidional: '',

			langRequest: false,

			additionalCodeError: false,
			additionalCodeSignMe: false,
			additionalCodeVisibility: false,
			signMeType: LoginSignMeType.Unused
		});

		this.forgotPasswordLinkUrl = Settings.app('forgotPasswordLinkUrl');
		this.registrationLinkUrl = Settings.app('registrationLinkUrl');

		this.formError = ko.observable(false).extend({ falseTimeout: 500 });

		this.allowLanguagesOnLogin = !!SettingsGet('AllowLanguagesOnLogin');

		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;

		this.bSendLanguage = false;

		this.addComputables({

			languageFullName: () => convertLangName(this.language()),

			signMeVisibility: () => LoginSignMeType.Unused !== this.signMeType()
		});

		this.addSubscribables({
			email: () => {
				this.emailError(false);
				this.additionalCode('');
				this.additionalCodeVisibility(false);
			},

			password: () => this.passwordError(false),

			additionalCode: () => this.additionalCodeError(false),
			additionalCodeVisibility: () => this.additionalCodeError(false),

			submitError: value => value || this.submitErrorAddidional(''),

			signMeType: iValue => this.signMe(LoginSignMeType.DefaultOn === iValue)
		});

		if (SettingsGet('AdditionalLoginError') && !this.submitError()) {
			this.submitError(SettingsGet('AdditionalLoginError'));
		}

		decorateKoCommands(this, {
			submitCommand: self => !self.submitRequest()
		});
	}

	submitCommand(self, event) {
		let email = this.email().trim(),
			valid = event.target.form.reportValidity() && email,
			pass = this.password(),
			totp = this.additionalCodeVisibility(),
			code = totp ? this.additionalCode() : '';

		this.emailError(!email);
		this.passwordError(!pass);
		this.formError(!valid);
		this.additionalCodeError(totp && !code);

		if (valid) {
			this.submitRequest(true);

			Remote.login(
				(iError, oData) => {
					if (iError) {
						this.submitRequest(false);
						if (Notification.InvalidInputArgument == iError) {
							iError = Notification.AuthError;
						}
						this.submitError(getNotification(iError, oData.ErrorMessage, Notification.UnknownNotification));
						this.submitErrorAddidional((oData && oData.ErrorMessageAdditional) || '');
					} else if (oData.TwoFactorAuth) {
						this.submitRequest(false);
						this.additionalCode('');
						this.additionalCodeVisibility(true);
						let input = this.querySelector('.inputAdditionalCode');
						input.required = true;
						setTimeout(() => input.focus(), 100);
					} else {
						rl.route.reload();
					}
				},
				email,
				pass,
				!!this.signMe(),
				this.bSendLanguage ? this.language() : '',
				code,
				!!(totp && this.additionalCodeSignMe())
			);

			Local.set(ClientSideKeyName.LastSignMe, this.signMe() ? '-1-' : '-0-');
		}

		return valid;
	}

	onShow() {
		rl.route.off();
	}

	onBuild() {
		const signMeLocal = Local.get(ClientSideKeyName.LastSignMe),
			signMe = (SettingsGet('SignMe') || 'unused').toLowerCase();

		switch (signMe) {
			case LoginSignMeTypeAsString.DefaultOff:
			case LoginSignMeTypeAsString.DefaultOn:
				this.signMeType(
					LoginSignMeTypeAsString.DefaultOn === signMe ? LoginSignMeType.DefaultOn : LoginSignMeType.DefaultOff
				);

				switch (signMeLocal) {
					case '-1-':
						this.signMeType(LoginSignMeType.DefaultOn);
						break;
					case '-0-':
						this.signMeType(LoginSignMeType.DefaultOff);
						break;
					// no default
				}

				break;
			case LoginSignMeTypeAsString.Unused:
			default:
				this.signMeType(LoginSignMeType.Unused);
				break;
		}

		setTimeout(() => {
			LanguageStore.language.subscribe((value) => {
				this.langRequest(true);

				translatorReload(false, value).then(
					() => {
						this.langRequest(false);
						this.bSendLanguage = true;
					},
					() => {
						this.langRequest(false);
					}
				);
			});
		}, 50);
	}

	submitForm() {
//		return false;
	}

	selectLanguage() {
		showScreenPopup(LanguagesPopupView, [this.language, this.languages(), LanguageStore.userLanguage()]);
	}
}

export { LoginUserView };
