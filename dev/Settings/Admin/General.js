import ko from 'ko';

import {
	pInt,
	settingsSaveHelperSimpleFunction,
	changeTheme,
	convertThemeName,
	convertLangName
} from 'Common/Utils';

import { SaveSettingsStep, Magics } from 'Common/Enums';
import { reload as translatorReload } from 'Common/Translator';

import { settingsGet } from 'Storage/Settings';
import { showScreenPopup } from 'Knoin/Knoin';

import Remote from 'Remote/Admin/Ajax';

import ThemeStore from 'Stores/Theme';
import LanguageStore from 'Stores/Language';
import AppAdminStore from 'Stores/Admin/App';
import CapaAdminStore from 'Stores/Admin/Capa';

class GeneralAdminSettings {
	constructor() {
		this.language = LanguageStore.language;
		this.languages = LanguageStore.languages;
		this.languageAdmin = LanguageStore.languageAdmin;
		this.languagesAdmin = LanguageStore.languagesAdmin;

		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;

		this.capaThemes = CapaAdminStore.themes;
		this.capaUserBackground = CapaAdminStore.userBackground;
		this.capaAdditionalAccounts = CapaAdminStore.additionalAccounts;
		this.capaIdentities = CapaAdminStore.identities;
		this.capaAttachmentThumbnails = CapaAdminStore.attachmentThumbnails;
		this.capaTemplates = CapaAdminStore.templates;

		this.allowLanguagesOnSettings = AppAdminStore.allowLanguagesOnSettings;
		this.weakPassword = AppAdminStore.weakPassword;
		this.newMoveToFolder = AppAdminStore.newMoveToFolder;

		this.dataFolderAccess = AppAdminStore.dataFolderAccess;

		this.mainAttachmentLimit = ko
			.observable(pInt(settingsGet('AttachmentLimit')) / (Magics.BitLength1024 * Magics.BitLength1024))
			.extend({ posInterer: 25 });

		this.uploadData = settingsGet('PhpUploadSizes');
		this.uploadDataDesc =
			this.uploadData && (this.uploadData.upload_max_filesize || this.uploadData.post_max_size)
				? [
						this.uploadData.upload_max_filesize
							? 'upload_max_filesize = ' + this.uploadData.upload_max_filesize + '; '
							: '',
						this.uploadData.post_max_size ? 'post_max_size = ' + this.uploadData.post_max_size : ''
				  ].join('')
				: '';

		this.themesOptions = ko.computed(() =>
			this.themes().map(theme => ({ optValue: theme, optText: convertThemeName(theme) }))
		);

		this.languageFullName = ko.computed(() => convertLangName(this.language()));
		this.languageAdminFullName = ko.computed(() => convertLangName(this.languageAdmin()));

		this.attachmentLimitTrigger = ko.observable(SaveSettingsStep.Idle);
		this.languageTrigger = ko.observable(SaveSettingsStep.Idle);
		this.languageAdminTrigger = ko.observable(SaveSettingsStep.Idle).extend({ throttle: Magics.Time100ms });
		this.themeTrigger = ko.observable(SaveSettingsStep.Idle);
	}

	onBuild() {
		setTimeout(() => {
			const f1 = settingsSaveHelperSimpleFunction(this.attachmentLimitTrigger, this),
				f2 = settingsSaveHelperSimpleFunction(this.languageTrigger, this),
				f3 = settingsSaveHelperSimpleFunction(this.themeTrigger, this),
				fReloadLanguageHelper = (saveSettingsStep) => () => {
					this.languageAdminTrigger(saveSettingsStep);
					setTimeout(() => this.languageAdminTrigger(SaveSettingsStep.Idle), Magics.Time1s);
				};

			this.mainAttachmentLimit.subscribe((value) => {
				Remote.saveAdminConfig(f1, {
					'AttachmentLimit': pInt(value)
				});
			});

			this.language.subscribe((value) => {
				Remote.saveAdminConfig(f2, {
					'Language': value.trim()
				});
			});

			this.languageAdmin.subscribe((value) => {
				this.languageAdminTrigger(SaveSettingsStep.Animate);
				translatorReload(true, value)
					.then(fReloadLanguageHelper(SaveSettingsStep.TrueResult), fReloadLanguageHelper(SaveSettingsStep.FalseResult))
					.then(() => {
						Remote.saveAdminConfig(null, {
							'LanguageAdmin': value.trim()
						});
					});
			});

			this.theme.subscribe((value) => {
				changeTheme(value, this.themeTrigger);
				Remote.saveAdminConfig(f3, {
					'Theme': value.trim()
				});
			});

			this.capaAdditionalAccounts.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'CapaAdditionalAccounts': value ? '1' : '0'
				});
			});

			this.capaIdentities.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'CapaIdentities': value ? '1' : '0'
				});
			});

			this.capaTemplates.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'CapaTemplates': value ? '1' : '0'
				});
			});

			this.capaAttachmentThumbnails.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'CapaAttachmentThumbnails': value ? '1' : '0'
				});
			});

			this.capaThemes.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'CapaThemes': value ? '1' : '0'
				});
			});

			this.capaUserBackground.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'CapaUserBackground': value ? '1' : '0'
				});
			});

			this.allowLanguagesOnSettings.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnSettings': value ? '1' : '0'
				});
			});

			this.newMoveToFolder.subscribe((value) => {
				Remote.saveAdminConfig(null, {
					'NewMoveToFolder': value ? '1' : '0'
				});
			});
		}, Magics.Time50ms);
	}

	selectLanguage() {
		showScreenPopup(require('View/Popup/Languages'), [this.language, this.languages(), LanguageStore.userLanguage()]);
	}

	selectLanguageAdmin() {
		showScreenPopup(require('View/Popup/Languages'), [
			this.languageAdmin,
			this.languagesAdmin(),
			LanguageStore.userLanguageAdmin()
		]);
	}
}

export { GeneralAdminSettings, GeneralAdminSettings as default };
