'use strict';

// RawClusterFallback v5.12.0
// Fixes: bind before listen, configureReporting, readAttributes, proper skip
const { logUnknownClusterAttr } = require('../utils/UnknownDPLogger');

const ZCL_AUTO_MAP = {
  'msTemperatureMeasurement.measuredValue': { cap: 'measure_temperature', div: 100 },
  'temperatureMeasurement.measuredValue': { cap: 'measure_temperature', div: 100 },
  'msRelativeHumidity.measuredValue': { cap: 'measure_humidity', div: 100 },
  'relativeHumidity.measuredValue': { cap: 'measure_humidity', div: 100 },
  'msPressureMeasurement.measuredValue': { cap: 'measure_pressure', div: 1 },
  'msIlluminanceMeasurement.measuredValue': { cap: 'measure_luminance', fn: 'lux' },
  'msOccupancySensing.occupancy': { cap: 'alarm_motion', fn: 'bool' },
  'occupancySensing.occupancy': { cap: 'alarm_motion', fn: 'bool' },
  'seMetering.instantaneousDemand': { cap: 'measure_power', div: 1 },
  'seMetering.currentSummDelivered': { cap: 'meter_power', div: 1000 },
  'haElectricalMeasurement.activePower': { cap: 'measure_power', div: 10 },
  'haElectricalMeasurement.rmsVoltage': { cap: 'measure_voltage', div: 10 },
  'haElectricalMeasurement.rmsCurrent': { cap: 'measure_current', div: 1000 },
  'genPowerCfg.batteryPercentageRemaining': { cap: 'measure_battery', div: 2 },
  'genAnalogInput.presentValue': { cap: null, detect: true },
  'closuresDoorLock.lockState': { cap: 'locked', fn: 'lock' },
};

const SKIP_CLUSTERS = new Set([
  'genBasic', 'genIdentify', 'genGroups', 'genScenes', 'genOta',
  'genTime', 'genPollCtrl', 'greenPower', 'touchlink',
  'tuya', 'tuyaSpecific', 'tuyaManufacturer', 'manuSpecificTuya',
  '61184', '0xEF00', 'genCommissioning',
]);

// Known readable attrs per cluster (for deferred reads)
const CLUSTER_ATTRS = {
  msTemperatureMeasurement: ['measuredValue'],
  temperatureMeasurement: ['measuredValue'],
  msRelativeHumidity: ['measuredValue'],
  relativeHumidity: ['measuredValue'],
  msPressureMeasurement: ['measuredValue', 'scaledValue'],
  msIlluminanceMeasurement: ['measuredValue'],
  msOccupancySensing: ['occupancy', 'occupancySensorType'],
  occupancySensing: ['occupancy'],
  seMetering: ['instantaneousDemand', 'currentSummDelivered'],
  haElectricalMeasurement: ['activePower', 'rmsVoltage', 'rmsCurrent'],
  genPowerCfg: ['batteryPercentageRemaining', 'batteryVoltage'],
  genAnalogInput: ['presentValue', 'description'],
  genMultistateInput: ['presentValue'],
  closuresDoorLock: ['lockState', 'doorState'],
  closuresWindowCovering: ['currentPositionLiftPercentage'],
  hvacThermostat: Y���[[\\�]\�I�	����\YYX][���]�[�	�	��\�[S[�I�K��[�]�[������\��[�]�[	�K��[�ۓٙ����ۓٙ��K�Y�[����ܐ������\��[�YI�	��\��[��]\�][ۉ�	���ܕ[\\�]\�SZ\�Y��K�N��[��[ۈ�۝�\��[YJX\[��K�[YJHY�
[X\[��HX\[��K�]X�
H�]\���[Y�
X\[��K���OOH	�^	�H�]\���[YHH��X]���[�
X]���L
�[YHHJH�L
JNY�
X\[��K���OOH	؛��	�H�]\�����X[��[YH	�JNY�
X\[��K���OOH	�����H�]\���[YHOOHNY�
X\[��K�]�H�]\��\[و�[YHOOH	۝[X�\����[YH�X\[��K�]���[YN�]\���[YNB���\���]��\�\��[�X���ۜ��X�܊]�X�JH\˙]�X�HH]�X�N\˗���H
���JHO�]�X�K���	�ԐU�Q�S�P��I����JN\˗ܘ]�H�N\˗�\�[�\��H�N\˗�X\YH\˗��\\�YHB��\�[��[�]X[^�J����JHY�
^����H^����K�[��[��H�]\��\˗���	���[��[��[[��[���܈[�[�Y�\�\�ˋ���N�]]X�YH�܈
�ۜ��\Y\Hوؚ�X��[��Y\�����K�[��[��JHY�
Y\Y\��\�\��H�۝[�YN�܈
�ۜ�ۘ[YK�\�\�Hوؚ�X��[��Y\�\��\�\��JHY�
\˗���[��\
�[YK�\�\�JH�۝[�YN�ۜ���H]�Z]\˗�]X�\�[�\��\�\��[YK\��R[�
\Y
JNY�
��H]X�Y
��B�B��\˗���]X�Y���]X�Y�]�\�[�\��ۈ	�]X�YH[�[�Y�\�\����	�[�\�\��[�XYH[�Y�H�]�\��N�Y�
]X�Y�
H\˗���Y[T�[[X\�J
N�]\��]X�YB�����[��\
�[YK�\�\�HY�
��T��T�T�˚\��[YJJH�]\���YNY�
\[و�\�\�OOH	�ؚ�X�	��\�\�OOH�[
H�]\���YNY�
�[YHOOH	��]�\�\��RY	��[YHOOH	ؚ[�	��[YHOOH	�[��[�	�H�]\���YN�ۜ�YH\˗��]Y
�[YK�\�\�NY�
YOOH�[	��Y�HL
H�]\���YNY�
\˗�\�[�Y
�[YJJH�]\���YN�]\���[�NB����]Y
�[YK�\�\�HY�
�\�\�	���\�\��QOOH[�Y�[�Y
H�]\���\�\��Q�ۜ��H\��R[�
�[YJN�]\��\ӘS��H��[��B���\�[�Y
�[YJH�ۜ��H\˙]�X�K���\�\�\�[�\��Y�
P\��^K�\�\��^J�
JH�]\���[�N�]\������YJO���^H	����^K��\���]
�[YH
�	Ή�JNB��\�[���]X�\�[�\��\�\��[YK\Y
HY�
X�\�\�\[و�\�\��ۈOOH	ٝ[��[ۉ�H�]\���[�N�ۜ��^HH�[YH
�	Ή�
�\YY�
\˗ܘ]���^WJH�]\���[�N�\˗ܘ]���^WHH�]�Έ�K��[���\���Y[��]K����
K\��Y[����[���[�HN���ԒUP�S�V�K�L����S��\�\��Y�ܙH\�[�[��HY�
\[و�\�\���[�OOH	ٝ[��[ۉ�H]�Z]��Z\�K��X�J�\�\���[�

K��]���Z\�J
��Z�HO��][Y[�]


HO��Z��]�\��܊	ؚ[�[Y[�]	�JKL
JK�JN\˗ܘ]���^WK���[�H�YNB�H�]�
JH\˗���	�T	�
�\Y
�	Έ�[�	�
��[YH
�	��Z[Y�	�
�K�Y\��Y�JNB����]X�]�]�[�\�[�\���ۜ�ې]�H
]��[YJHO�\˗�۔�]�]��^K�[YK]��[YK\Y
N�H�\�\��ۊ	�]��ې]�N\˗�\�[�\�˜\�
��\�\�]�[��	�]��[�\��ې]�JNH�]�
JH��]\���[�N�B�����V�K�L���Y�\��Y�ۙ�Y�\�T�\ܝ[��
��XY]�X�]\\˗�Y�\��\�\��XY
�\�\��[YK\Y�^JN�\˗���	�T	�
�\Y
�	Έ\�[�[��ۈ	�
��[YH
�
\˗ܘ]���^WK���[��	�
��[�
I��	�
[���[�
I�JN�]\���YNB���Y�\��\�\��XY
�\�\��[YK\Y�^JH�ۜ�[^HH�
�X]���܊X]��[��J
H
�
N�][Y[�]
\�[��

HO����\N��H�ۙ�Y�\�T�\ܝ[���܈ۛ�ۈ]��ۜ�ۛ�ې]��H�T�T��U��ۘ[YWNY�
ۛ�ې]��	��\[و�\�\���ۙ�Y�\�T�\ܝ[��OOH	ٝ[��[ۉ�H�H�ۜ��]��Hۛ�ې]�˜�X�J�K�X\
HO�
]�X�]S�[YN�K�Z[�[][T�\ܝ[�\��[���X^[][T�\ܝ[�\��[�͌��\ܝX�P�[��N�K�JJN]�Z]��Z\�K��X�J�\�\���ۙ�Y�\�T�\ܝ[���]�X�]\Έ�]��JK��]���Z\�J
��Z�HO��][Y[�]


HO��Z��]�\��܊	�[Y[�]	�JKL
JK�JN\˗���	�T	�
�\Y
�	Έ�\ܝ[���ۙ�Y�\�Y�܈	�
��[YJNH�]�
JH\˗���	�T	�
�\Y
�	Έ�\ܝ[���ۙ�Y�	�
��[YH
�	���\Y�	�
�K�Y\��Y�JNB�B�����\���H�XY]�X�]\��܈ۛ�ۈ]��ۜ��XY]��Hۛ�ې]�����\�[��[YI�NY�
\[و�\�\���XY]�X�]\�OOH	ٝ[��[ۉ�H�H�ۜ��[Y\�H]�Z]��Z\�K��X�J�\�\���XY]�X�]\��XY]��K��]���Z\�J
��Z�HO��][Y[�]


HO��Z��]�\��܊	�[Y[�]	�JKL
JK�JNY�
�[Y\�	��\[و�[Y\�OOH	�ؚ�X�	�H�܈
�ۜ��]��[Hوؚ�X��[��Y\��[Y\�JHY�
�[OH�[
H\˗�۔�]�]��^K�[YK]��[\Y
NB�\˗��	��T	�
�\Y
�	Έ�XY	�
�ؚ�X���^\��[Y\�K�[��
�	�]�����H	�
��[YJNB�H�]�
JH\˗���	�T	�
�\Y
�	Έ�XY	�
��[YH
�	��Z[Y�	�
�K�Y\��Y�JNB�B�K[^JNB���۔�]�]��^K�\�\�]��[YK\Y
H�ۜ�[��HH\˗ܘ]���^WNY�
Y[��JH�]\��[��K���[�
��[��K�\��Y[�H]K����
N[��K�]���]�HH����[YK�\[و�[YKΈ]K����
HN\˗��\\�Y
����ۜ��[��H��Ӌ���[��Y�J�[YJN\˗���	�T	�
�\Y
�	�	�
��\�\�
�	ˉ�
�]�
�	�H	�
�
�[���[���L���[����X�JL�
H
�	ˋ�����[��JN���[�ۛ�ې�\�\�]�\˙]�X�K�\�\�]��[YK\Y
N\˗��P]]�X\
�\�\�]��[YK\Y
NB����P]]�X\
�\�\�]��[YK\Y
H�ۜ�X\�^HH�\�\�
�	ˉ�
�]��ۜ�X\[��H���UU��PT�X\�^WNY�
[X\[��X\[�˙]X�
H�]\����ۜ��\HX\[�˘�\Y�
X�\
H�]\����ۜ��[�[�[YHH�۝�\��[YJX\[���[YJNY�
�[�[�[YHOOH�[
H�]\��Y�
\[و�[�[�[YHOOH	۝[X�\��	��Z\њ[�]J�[�[�[YJJH�]\���Y�
\˙]�X�K�\��\X�[]J�\
JH\˙]�X�K��]�\X�[]U�[YJ�\�[�[�[YJK��]�


HO��JN\˗���	�UU�SPT�	�
��\�\�
�	ˉ�
�]�
�	�O�	�
��\
�	�H	�
��[�[�[YJN\˗�X\Y
��H[�HY�
�\��\���]
	�YX\�\�W��H�\��\���]
	�Y]\���H�\��\���]
	�[\�W��JH\˙]�X�K�Y�\X�[]J�\
K�[�

HO�\˙]�X�K��]�\X�[]U�[YJ�\�[�[�[YJK��]�


HO��JN\˗���	�UU�PQ
�PT�	�
��\
�	�H	�
��[�[�[YJN\˗�X\Y
��JK��]�


HO��JNB�B�����Y[T�[[X\�J
H\˗��[[X\�U[Y\�H�][Y[�]


HO�\˗�ܚ]T�[[X\�J
NY�
\˗��\\�Y�
H\˗���Y[T�[[X\�J
NK�
NB���ܚ]T�[[X\�J
H�ۜ��[[X\�HH�N�܈
�ۜ���^K[��WHوؚ�X��[��Y\�\˗ܘ]�JHY�
[��K���[�OOH
H�۝[�YN�[[X\�V��^WHH��[��[��K���[����[��[��K���[��\��Y[��[��K�\��Y[��]�Έؚ�X�����Q[��Y\��ؚ�X��[��Y\�[��K�]��K�X\

�KJHO��K�������WJB�
K�NB�Y�
ؚ�X���^\��[[X\�JK�[���
H\˙]�X�K��]�ܙU�[YJ	�ܘ]���\�\���[[X\�I��[[X\�JK��]�


HO��JN\˗���	��[[X\�N�	�
�\˗��\\�Y
�	��\\�Y	�
�\˗�X\Y
�	�]]�[X\Y	�N�H\˙]�X�K��]�][�����]���\�\���Έ��Ӌ���[��Y�J�[[X\�JK��X�JL�
HJK��]�


HO��JNH�]�
JH�ʈ�][����^HX^H��^\�
��B�B�B���]�[[X\�J
H�]\���\\�Y�\˗��\\�Y�X\Y�\˗�X\Y��\�\�Έؚ�X���^\�\˗ܘ]�K��[\��O�\˗ܘ]���K���[��
K��]Έ\˗ܘ]��NB��\���J
HY�
\˗��[[X\�U[Y\�H�X\�[Y[�]
\˗��[[X\�U[Y\�N�܈
�ۜ���\�\���]�[��K[�\��Hو\˗�\�[�\��H�H�Y�
˜�[[ݙS\�[�\�H˜�[[ݙS\�[�\�K
N�H�]�

H�B�B�\˗�\�[�\��H�NB�B��[�[K�^ܝ�H�]��\�\��[�X��