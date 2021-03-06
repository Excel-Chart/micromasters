# -*- coding: utf-8 -*-
# Generated by Django 1.9.8 on 2016-09-26 20:28
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('financialaid', '0004_modified_financial_aid_audit'),
    ]

    operations = [
        migrations.CreateModel(
            name='FinancialAidEmailAudit',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('updated_on', models.DateTimeField(auto_now=True)),
                ('to_email', models.CharField(max_length=250)),
                ('from_email', models.CharField(max_length=250)),
                ('email_subject', models.CharField(max_length=250)),
                ('email_body', models.TextField()),
                ('acting_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('financial_aid', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='financialaid.FinancialAid')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
